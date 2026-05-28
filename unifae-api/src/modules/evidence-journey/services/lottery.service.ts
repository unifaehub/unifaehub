import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { EvidenceWorkEntity } from '../../../database/entities/evidence-work.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { RoomProfessorEntity } from '../../../database/entities/room-professor.entity';
import { ProfessorAvailabilityEntity } from '../../../database/entities/professor-availability.entity';
import { WorkGroupEntity } from '../../../database/entities/work-group.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { EvidenceWorkStatus, UserRole } from '../../../database/entities/enums';
import { AuditService } from '../../audit/audit.service';
import type { RequestContext } from '../../../common/http/request-context';

const MAX_WORKS_PER_ROOM = 10;
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

  async runLottery(
    dataEvento: string,
    executorId: number,
    ctx?: RequestContext,
  ) {
    // 1. Limpar sorteio anterior para este dia
    const existingRooms = await this.rooms.find({ where: { dataEvento } });
    if (existingRooms.length > 0) {
      const roomIds = existingRooms.map((r) => r.id);
      const trabalhoIds = existingRooms.map((r) => r.trabalhoId);
      await this.roomProfessors.delete({ salaId: In(roomIds) as any });
      await this.groups.delete({ trabalhoId: In(trabalhoIds) as any });
      await this.rooms.delete({ dataEvento });
    }

    // 2. Trabalhos aprovados
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
        `São necessários ao menos ${MIN_PROFESSORS_PER_BANCA} professores disponíveis.`,
      );
    }
    const professors = avails.map((a) => a.professor);

    // 4. Embaralhar trabalhos e professores
    const shuffledWorks = this.shuffle([...approvedWorks]);
    const shuffledProfessors = this.shuffle([...professors]);

    // 5. Distribuir trabalhos em salas (max 10 por sala)
    const workChunks = this.chunkArray(shuffledWorks, MAX_WORKS_PER_ROOM);
    const savedRooms: PresentationRoomEntity[] = [];

    const alunoRoomDayMap = new Map<number, number>(); // alunoId -> count on day

    for (const chunk of workChunks) {
      // Regra: aluno não pode ter 2 apresentações no mesmo dia
      const validWorks = chunk.filter((w) => {
        const count = alunoRoomDayMap.get(w.alunoId) ?? 0;
        return count === 0;
      });
      if (validWorks.length === 0) continue;

      // Selecionar professores compatíveis para este chunk
      // Regra: professor não avalia alunos do seu curso_base
      const chunkCursos = [...new Set(validWorks.map((w) => w.cursoTrabalho))];
      const eligibleProfessors = shuffledProfessors.filter(
        (p) => !chunkCursos.includes(p.cursoBase ?? ''),
      );

      if (eligibleProfessors.length < MIN_PROFESSORS_PER_BANCA) {
        continue; // pula salas sem banca suficiente
      }

      const bancaSize = Math.min(MAX_PROFESSORS_PER_BANCA, eligibleProfessors.length);
      const banca = eligibleProfessors.slice(0, bancaSize);
      const lider = banca[0];

      // Criar uma sala por trabalho no chunk
      for (const work of validWorks) {
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

        // Registrar grupo (aluno -> trabalho -> dia)
        await this.groups.save(
          this.groups.create({ alunoId: work.alunoId, trabalhoId: work.id }),
        );

        alunoRoomDayMap.set(work.alunoId, (alunoRoomDayMap.get(work.alunoId) ?? 0) + 1);
        savedRooms.push(savedRoom);
      }

      // Rotacionar professores para próxima sala
      shuffledProfessors.push(...shuffledProfessors.splice(0, bancaSize));
    }

    await this.audit.log({
      userId: executorId,
      action: 'LOTTERY_RUN',
      entity: 'evidence-journey/lottery',
      entityId: dataEvento,
      metadata: { roomsCreated: savedRooms.length, worksProcessed: approvedWorks.length },
      ctx: ctx ?? null,
    });

    return {
      roomsCreated: savedRooms.length,
      dataEvento,
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
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
