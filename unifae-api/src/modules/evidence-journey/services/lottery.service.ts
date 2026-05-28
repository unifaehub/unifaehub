import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { EvidenceWorkEntity } from '../../../database/entities/evidence-work.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { RoomProfessorEntity } from '../../../database/entities/room-professor.entity';
import { ProfessorAvailabilityEntity } from '../../../database/entities/professor-availability.entity';
import { WorkGroupEntity } from '../../../database/entities/work-group.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { EvidenceWorkStatus } from '../../../database/entities/enums';
import { AuditService } from '../../audit/audit.service';
import type { RequestContext } from '../../../common/http/request-context';

const MIN_PROFESSORS_PER_BANCA = 2;
const MAX_PROFESSORS_PER_BANCA = 3;

@Injectable()
export class LotteryService {
  constructor(
    @InjectRepository(EvidenceWorkEntity)
    private readonly works: Repository<EvidenceWorkEntity>,
    @InjectRepository(PresentationRoomEntity)
    private readonly rooms: Repository<PresentationRoomEntity>,
    @InjectRepository(RoomProfessorEntity)
    private readonly roomProfessors: Repository<RoomProfessorEntity>,
    @InjectRepository(ProfessorAvailabilityEntity)
    private readonly availabilities: Repository<ProfessorAvailabilityEntity>,
    @InjectRepository(WorkGroupEntity)
    private readonly groups: Repository<WorkGroupEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly audit: AuditService,
  ) {}

  async runLottery(dataEvento: string, executorId: number, ctx?: RequestContext) {
    // 1. Limpar sorteio anterior para este dia
    const existingRooms = await this.rooms.find({ where: { dataEvento } });
    if (existingRooms.length > 0) {
      const roomIds      = existingRooms.map((r) => r.id);
      const trabalhoIds  = existingRooms.map((r) => r.trabalhoId);
      await this.roomProfessors.delete({ salaId: In(roomIds) as any });
      await this.groups.delete({ trabalhoId: In(trabalhoIds) as any });
      await this.rooms.delete({ dataEvento });
    }

    // 2. Trabalhos aprovados (sem exclusão lógica)
    const approvedWorks = await this.works.find({
      where: { status: EvidenceWorkStatus.APROVADO, deletedAt: IsNull() },
      relations: ['aluno'],
    });
    if (approvedWorks.length === 0) {
      throw new BadRequestException('Nenhum trabalho aprovado encontrado para o sorteio.');
    }

    // 3. Professores disponíveis no dia
    const avails = await this.availabilities.find({
      where: { dataEvento },
      relations: ['professor'],
    });
    if (avails.length < MIN_PROFESSORS_PER_BANCA) {
      throw new BadRequestException(
        `São necessários ao menos ${MIN_PROFESSORS_PER_BANCA} professores disponíveis para a data ${dataEvento}. ` +
        `Cadastre disponibilidades na tela de Professores.`,
      );
    }
    const professors = avails.map((a) => a.professor);

    // 4. Embaralhar trabalhos e professores
    const shuffledWorks      = this.shuffle([...approvedWorks]);
    let   professorIndex     = 0;
    const savedRooms: PresentationRoomEntity[] = [];
    const alunoUsed          = new Set<number>(); // um trabalho por aluno por dia

    for (const work of shuffledWorks) {
      // Regra: aluno não apresenta duas vezes no mesmo dia
      if (alunoUsed.has(work.alunoId)) continue;

      // 5. Selecionar banca elegível POR TRABALHO
      // Regra: professor não avalia alunos do mesmo cursoBase que o trabalho
      const eligible = professors.filter(
        (p) => (p.cursoBase ?? '').toLowerCase() !== (work.cursoTrabalho ?? '').toLowerCase(),
      );

      if (eligible.length < MIN_PROFESSORS_PER_BANCA) {
        // Não há banca suficiente para este trabalho — pular, não cancelar o sorteio inteiro
        continue;
      }

      // Rotacionar para distribuir carga entre professores
      const rotated   = this.rotateArray(eligible, professorIndex);
      const bancaSize = Math.min(MAX_PROFESSORS_PER_BANCA, rotated.length);
      const banca     = rotated.slice(0, bancaSize);
      const lider     = banca[0];

      professorIndex = (professorIndex + bancaSize) % professors.length;

      // 6. Criar sala
      const room = this.rooms.create({
        dataEvento,
        trabalhoId: work.id,
        professorLiderId: lider.id,
        fechada: false,
      });
      const savedRoom = await this.rooms.save(room);

      for (const prof of banca) {
        await this.roomProfessors.save(
          this.roomProfessors.create({ salaId: savedRoom.id, professorId: prof.id }),
        );
      }

      // Registrar grupo (aluno ↔ trabalho no dia)
      await this.groups.save(
        this.groups.create({ alunoId: work.alunoId, trabalhoId: work.id }),
      );

      alunoUsed.add(work.alunoId);
      savedRooms.push(savedRoom);
    }

    const skipped = approvedWorks.length - savedRooms.length;

    await this.audit.log({
      userId: executorId,
      action: 'LOTTERY_RUN',
      entity: 'evidence-journey/lottery',
      entityId: dataEvento,
      metadata: {
        roomsCreated: savedRooms.length,
        worksProcessed: approvedWorks.length,
        skipped,
      },
      ctx: ctx ?? null,
    });

    return {
      roomsCreated: savedRooms.length,
      skipped,
      dataEvento,
      message:
        savedRooms.length === 0
          ? 'Nenhuma sala criada. Verifique se há professores disponíveis e se os cursos base não conflitam com os trabalhos aprovados.'
          : `Sorteio concluído: ${savedRooms.length} sala(s) criada(s)${skipped > 0 ? `, ${skipped} trabalho(s) sem banca elegível` : ''}.`,
    };
  }

  async getRooms(dataEvento: string) {
    return this.rooms.find({
      where: { dataEvento },
      relations: ['trabalho', 'trabalho.aluno', 'professorLider', 'banca', 'banca.professor'],
      order: { id: 'ASC' },
    });
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  private rotateArray<T>(arr: T[], offset: number): T[] {
    const n = arr.length;
    if (n === 0) return arr;
    const start = ((offset % n) + n) % n;
    return [...arr.slice(start), ...arr.slice(0, start)];
  }
}
