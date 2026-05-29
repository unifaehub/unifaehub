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
import { RoomWorkEntity } from '../../../database/entities/room-work.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { EvidenceWorkStatus, RoomType, WorkCategory, WorkType } from '../../../database/entities/enums';
import { AuditService } from '../../audit/audit.service';
import type { RequestContext } from '../../../common/http/request-context';
import type { RoomTypeConfigDto } from '../dto/run-lottery.dto';

const MIN_PROFESSORS_PER_BANCA  = 2;
const MAX_PROFESSORS_PER_BANCA  = 3;

/** Máximo de trabalhos por tipo de sala, se não especificado no DTO. */
const DEFAULT_MAX_BY_TIPO: Record<RoomType, number> = {
  [RoomType.GERAL]:        10,
  [RoomType.MOSTRA_JOGOS]: 10,
  [RoomType.PRATICO]:       5,
  [RoomType.ARTIGO_TCC]:   10,
  [RoomType.IC]:            10,
};

/** Quais categorias / tipos de trabalho cada tipo de sala aceita. null = aceita tudo. */
const TIPO_SALA_FILTRO: Record<RoomType, { categoria?: WorkCategory; tipoTrabalho?: WorkType | null } | null> = {
  [RoomType.GERAL]:        null,
  [RoomType.MOSTRA_JOGOS]: { categoria: WorkCategory.MOSTRA_JOGOS },
  [RoomType.PRATICO]:      { tipoTrabalho: WorkType.DESENVOLVIMENTO_PRATICO },
  [RoomType.ARTIGO_TCC]:   { tipoTrabalho: WorkType.TCC },       // TCC e Pesquisa
  [RoomType.IC]:           { tipoTrabalho: WorkType.INICIACAO_CIENTIFICA },
};

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
    @InjectRepository(RoomWorkEntity)
    private readonly roomWorks: Repository<RoomWorkEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluations: Repository<EvaluationEntity>,
    @InjectRepository(DynamicQuestionEntity)
    private readonly questions: Repository<DynamicQuestionEntity>,
    private readonly audit: AuditService,
  ) {}

  async runLottery(
    dataEvento: string,
    executorId: number,
    tiposSala?: RoomTypeConfigDto[],
    ctx?: RequestContext,
  ) {
    // ── 1. Limpar sorteio anterior ──────────────────────────────────────────
    const existingRooms = await this.rooms.find({ where: { dataEvento } });
    if (existingRooms.length > 0) {
      const roomIds = existingRooms.map((r) => r.id);
      const rws     = await this.roomWorks.find({ where: { salaId: In(roomIds) as any } });
      const trabIds = rws.map((rw) => rw.trabalhoId);

      await this.roomWorks.delete({ salaId: In(roomIds) as any });
      await this.roomProfessors.delete({ salaId: In(roomIds) as any });
      if (trabIds.length) await this.groups.delete({ trabalhoId: In(trabIds) as any });
      await this.rooms.delete({ dataEvento });
    }

    // ── 2. Trabalhos aprovados ──────────────────────────────────────────────
    const approvedWorks = await this.works.find({
      where: { status: EvidenceWorkStatus.APROVADO, deletedAt: IsNull() },
      relations: ['aluno'],
    });
    if (approvedWorks.length === 0) {
      throw new BadRequestException('Nenhum trabalho aprovado encontrado para o sorteio.');
    }

    // ── 3. Professores disponíveis ──────────────────────────────────────────
    const avails = await this.availabilities.find({
      where: { dataEvento },
      relations: ['professor'],
    });
    const professors = avails.map((a) => a.professor);

    // ── 4. Calcular quantas salas e quantos professores são necessários ──────
    const roomConfigs = this.buildRoomConfigs(tiposSala, approvedWorks);
    const totalRooms  = roomConfigs.reduce((s, c) => s + c.quantidade, 0);
    const profsNeeded = totalRooms * MIN_PROFESSORS_PER_BANCA;

    if (professors.length < profsNeeded) {
      const faltam = profsNeeded - professors.length;
      throw new BadRequestException(
        `Professores insuficientes para o sorteio.\n` +
        `Salas planejadas: ${totalRooms} · Professores disponíveis: ${professors.length} · ` +
        `Necessário: ${profsNeeded} (mínimo ${MIN_PROFESSORS_PER_BANCA} por sala).\n` +
        `Cadastre mais ${faltam} professor(es) disponível(is) para ${dataEvento}.`,
      );
    }

    // ── 5. Distribuir trabalhos nas salas por tipo ──────────────────────────
    const savedRooms: PresentationRoomEntity[] = [];
    let   professorIndex = 0;
    // Cada professor só pode ser atribuído a UMA sala por dia
    const assignedProfIds = new Set<number>();

    for (const cfg of roomConfigs) {
      const worksForType = this.shuffle([...cfg.works]);
      const chunks       = this.chunkArray(worksForType, cfg.maxTrabalhos);

      for (const chunk of chunks) {
        if (chunk.length === 0) continue;

        // Selecionar professores elegíveis (não usados ainda neste dia)
        const available = professors.filter((p) => !assignedProfIds.has(p.id));

        // Filtrar por cursoBase dos trabalhos do chunk
        const coursesInChunk = new Set(
          chunk.map((w) => (w.cursoTrabalho ?? '').toLowerCase()),
        );
        const eligible = available.filter(
          (p) => !coursesInChunk.has((p.cursoBase ?? '').toLowerCase()),
        );

        if (eligible.length < MIN_PROFESSORS_PER_BANCA) {
          // Não há banca suficiente para este grupo — pular
          continue;
        }

        const rotated   = this.rotateArray(eligible, professorIndex);
        const bancaSize = Math.min(MAX_PROFESSORS_PER_BANCA, rotated.length);
        const banca     = rotated.slice(0, bancaSize);
        const lider     = banca[0];

        professorIndex = (professorIndex + bancaSize) % professors.length;

        // Marcar professores como usados neste dia
        for (const p of banca) assignedProfIds.add(p.id);

        // Criar sala
        const room = await this.rooms.save(
          this.rooms.create({
            dataEvento,
            tipoSala: cfg.tipo,
            professorLiderId: lider.id,
            fechada: false,
          }),
        );

        // Criar room_works (um por trabalho)
        for (let i = 0; i < chunk.length; i++) {
          await this.roomWorks.save(
            this.roomWorks.create({ salaId: room.id, trabalhoId: chunk[i].id, ordem: i + 1 }),
          );
          // Registrar grupo (aluno ↔ trabalho)
          await this.groups.save(
            this.groups.create({ alunoId: chunk[i].alunoId, trabalhoId: chunk[i].id }),
          );
        }

        // Atribuir banca
        for (const prof of banca) {
          await this.roomProfessors.save(
            this.roomProfessors.create({ salaId: room.id, professorId: prof.id }),
          );
        }

        savedRooms.push(room);
      }
    }

    const skipped = approvedWorks.length - savedRooms.reduce((s, _) => s, 0);

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
      message:
        savedRooms.length === 0
          ? 'Nenhuma sala criada. Verifique professores disponíveis e conflitos de curso base.'
          : `Sorteio concluído: ${savedRooms.length} sala(s) criada(s).`,
    };
  }

  /**
   * Monta a lista de configs de sala, distribuindo os trabalhos aprovados
   * conforme os tipos solicitados (ou GERAL com todos os trabalhos se não especificado).
   */
  private buildRoomConfigs(
    tiposSala: RoomTypeConfigDto[] | undefined,
    approvedWorks: EvidenceWorkEntity[],
  ) {
    if (!tiposSala?.length) {
      const max = DEFAULT_MAX_BY_TIPO[RoomType.GERAL];
      return [{
        tipo:        RoomType.GERAL,
        maxTrabalhos: max,
        quantidade:  Math.ceil(approvedWorks.length / max),
        works:       approvedWorks,
      }];
    }

    const usedIds = new Set<number>();
    const configs: { tipo: RoomType; maxTrabalhos: number; quantidade: number; works: EvidenceWorkEntity[] }[] = [];

    for (const cfg of tiposSala) {
      const max    = cfg.maxTrabalhos ?? DEFAULT_MAX_BY_TIPO[cfg.tipo] ?? 10;
      const filtro = TIPO_SALA_FILTRO[cfg.tipo];

      let filtered: EvidenceWorkEntity[];
      if (!filtro) {
        filtered = approvedWorks.filter((w) => !usedIds.has(w.id));
      } else if (filtro.categoria) {
        filtered = approvedWorks.filter(
          (w) => !usedIds.has(w.id) && w.categoria === filtro.categoria,
        );
      } else if (filtro.tipoTrabalho) {
        const aceitos: WorkType[] =
          cfg.tipo === RoomType.ARTIGO_TCC
            ? [WorkType.TCC, WorkType.PESQUISA]
            : [filtro.tipoTrabalho];
        filtered = approvedWorks.filter(
          (w) => !usedIds.has(w.id) && aceitos.includes(w.tipoTrabalho as WorkType),
        );
      } else {
        filtered = [];
      }

      for (const w of filtered) usedIds.add(w.id);

      const qtd = cfg.quantidade ?? Math.max(1, Math.ceil(filtered.length / max));
      configs.push({ tipo: cfg.tipo, maxTrabalhos: max, quantidade: qtd, works: filtered });
    }

    // Trabalhos não cobertos pelos tipos explícitos → GERAL
    const remaining = approvedWorks.filter((w) => !usedIds.has(w.id));
    if (remaining.length) {
      const max = DEFAULT_MAX_BY_TIPO[RoomType.GERAL];
      configs.push({
        tipo:         RoomType.GERAL,
        maxTrabalhos: max,
        quantidade:   Math.ceil(remaining.length / max),
        works:        remaining,
      });
    }

    return configs;
  }

  async getRooms(dataEvento: string) {
    return this.rooms.find({
      where: { dataEvento },
      relations: ['professorLider', 'banca', 'banca.professor', 'works', 'works.trabalho', 'works.trabalho.aluno'],
      order: { id: 'ASC' },
    });
  }

  async getRoomsWithStatus(dataEvento: string) {
    const rooms = await this.getRooms(dataEvento);
    if (!rooms.length) return [];

    const allQuestions = await this.questions.find({ where: { ativo: true } });
    const resumoQIds   = allQuestions.filter((q) => q.tipo === QuestionType.RESUMO).map((q) => q.id);
    const apresQIds    = allQuestions.filter((q) => q.tipo === QuestionType.APRESENTACAO).map((q) => q.id);

    const allTrabIds = rooms.flatMap((r) => r.works.map((rw) => rw.trabalhoId));
    const evals = allTrabIds.length
      ? await this.evaluations.find({ where: { trabalhoId: In(allTrabIds) } })
      : [];

    return rooms.map((room) => {
      const banca   = room.banca ?? [];
      const profIds = banca.map((rp) => rp.professor.id);

      // Status por tipo, agrupando por professor, sobre todos os trabalhos da sala
      const evalStatus = (questionIds: number[]) => {
        if (!questionIds.length) return { total: profIds.length, done: 0, pending: banca.map((rp) => rp.professor), overall: 'sem_perguntas' as const };

        // Professor considerado "completo" se respondeu todas as perguntas de todos os trabalhos da sala
        const trabIds = room.works.map((rw) => rw.trabalhoId);
        const profsDone = profIds.filter((pid) =>
          trabIds.every((tid) =>
            questionIds.every((qid) =>
              evals.some((e) => e.professorId === pid && e.trabalhoId === tid && e.perguntaId === qid),
            ),
          ),
        );

        const profsPending = banca
          .filter((rp) => !profsDone.includes(rp.professor.id))
          .map((rp) => ({ id: rp.professor.id, name: rp.professor.name }));

        const overall =
          profsDone.length === 0              ? 'nao_iniciado' :
          profsDone.length < profIds.length   ? 'parcial'       : 'completo';

        return { total: profIds.length, done: profsDone.length, pending: profsPending, overall };
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

  async swapProfessor(salaId: number, oldProfessorId: number, newProfessorId: number) {
    const room = await this.rooms.findOne({ where: { id: salaId } });
    if (!room) throw new Error('Sala não encontrada.');
    const dataEvento = room.dataEvento;

    const avail = await this.availabilities.findOne({ where: { professorId: newProfessorId, dataEvento } });
    if (!avail) {
      await this.availabilities.save(
        this.availabilities.create({ professorId: newProfessorId, dataEvento }),
      );
    }

    const roomsOnDate = await this.rooms.find({ where: { dataEvento } });
    let updated = 0;
    for (const r of roomsOnDate) {
      const bancaEntry = await this.roomProfessors.findOne({ where: { salaId: r.id, professorId: oldProfessorId } });
      if (!bancaEntry) continue;

      await this.roomProfessors.delete({ salaId: r.id, professorId: oldProfessorId });
      await this.roomProfessors.save(
        this.roomProfessors.create({ salaId: r.id, professorId: newProfessorId }),
      );

      if (r.professorLiderId === oldProfessorId) {
        await this.rooms.update(r.id, { professorLiderId: newProfessorId });
      }
      updated++;
    }

    return { swappedInRooms: updated, dataEvento };
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

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }
}
