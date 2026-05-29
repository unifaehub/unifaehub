import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { EvaluationEntity } from '../../../database/entities/evaluation.entity';
import { DynamicQuestionEntity } from '../../../database/entities/dynamic-question.entity';
import { QuestionType } from '../../../database/entities/enums';
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
    @InjectRepository(EvaluationEntity)
    private readonly evaluations: Repository<EvaluationEntity>,
    @InjectRepository(DynamicQuestionEntity)
    private readonly questions: Repository<DynamicQuestionEntity>,
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

  async getRoomsWithStatus(dataEvento: string) {
    const rooms = await this.getRooms(dataEvento);
    if (!rooms.length) return [];

    // Buscar todas as questões ativas
    const allQuestions = await this.questions.find({ where: { ativo: true } });
    const resumoQIds   = allQuestions.filter((q) => q.tipo === QuestionType.RESUMO).map((q) => q.id);
    const apresQIds    = allQuestions.filter((q) => q.tipo === QuestionType.APRESENTACAO).map((q) => q.id);

    // Buscar todas as avaliações para todos os trabalhos das salas
    const trabalhoIds = rooms.map((r) => r.trabalhoId);
    const evals = trabalhoIds.length
      ? await this.evaluations.find({ where: { trabalhoId: In(trabalhoIds) } })
      : [];

    return rooms.map((room) => {
      const banca    = room.banca ?? [];
      const profIds  = banca.map((rp) => rp.professor.id);
      const roomEvals = evals.filter((e) => e.trabalhoId === room.trabalhoId);

      const evalStatus = (questionIds: number[]) => {
        if (!questionIds.length) return { total: profIds.length, done: 0, pending: banca.map((rp) => rp.professor), overall: 'sem_perguntas' as const };
        const profsDone = profIds.filter((pid) =>
          questionIds.every((qid) => roomEvals.some((e) => e.professorId === pid && e.perguntaId === qid)),
        );
        const profsPending = banca
          .filter((rp) => !profsDone.includes(rp.professor.id))
          .map((rp) => ({ id: rp.professor.id, name: rp.professor.name }));

        const overall =
          profsDone.length === 0    ? 'nao_iniciado' :
          profsDone.length < profIds.length ? 'parcial'       : 'completo';

        return {
          total:   profIds.length,
          done:    profsDone.length,
          pending: profsPending,
          overall,
        };
      };

      return {
        ...room,
        evaluationStatus: {
          resumo:       evalStatus(resumoQIds),
          apresentacao: evalStatus(apresQIds),
          geral: (() => {
            const r = evalStatus(resumoQIds).overall;
            const a = evalStatus(apresQIds).overall;
            if (r === 'completo' && a === 'completo') return 'completo';
            if (r === 'nao_iniciado' && a === 'nao_iniciado') return 'nao_iniciado';
            return 'parcial';
          })(),
        },
      };
    });
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  /**
   * Troca um professor em TODAS as salas da data em que ele aparece na banca.
   * O novo professor deve ter disponibilidade cadastrada para a data.
   */
  async swapProfessor(salaId: number, oldProfessorId: number, newProfessorId: number) {
    const room = await this.rooms.findOne({ where: { id: salaId } });
    if (!room) throw new Error('Sala não encontrada.');
    const dataEvento = room.dataEvento;

    // Verificar disponibilidade do novo professor na data
    const avail = await this.availabilities.findOne({
      where: { professorId: newProfessorId, dataEvento },
    });
    if (!avail) {
      // Adicionar disponibilidade automaticamente se não existir
      await this.availabilities.save(
        this.availabilities.create({ professorId: newProfessorId, dataEvento }),
      );
    }

    // Substituir em TODAS as salas da data
    const roomsOnDate = await this.rooms.find({ where: { dataEvento } });
    let updated = 0;
    for (const r of roomsOnDate) {
      const bancaEntry = await this.roomProfessors.findOne({
        where: { salaId: r.id, professorId: oldProfessorId },
      });
      if (!bancaEntry) continue;

      await this.roomProfessors.delete({ salaId: r.id, professorId: oldProfessorId });
      await this.roomProfessors.save(
        this.roomProfessors.create({ salaId: r.id, professorId: newProfessorId }),
      );

      // Atualizar líder se necessário
      if (r.professorLiderId === oldProfessorId) {
        await this.rooms.update(r.id, { professorLiderId: newProfessorId });
      }
      updated++;
    }

    return { swappedInRooms: updated, dataEvento };
  }

  private rotateArray<T>(arr: T[], offset: number): T[] {
    const n = arr.length;
    if (n === 0) return arr;
    const start = ((offset % n) + n) % n;
    return [...arr.slice(start), ...arr.slice(0, start)];
  }
}
