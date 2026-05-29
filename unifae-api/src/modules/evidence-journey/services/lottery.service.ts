import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { EvaluationEntity } from '../../../database/entities/evaluation.entity';
import { DynamicQuestionEntity } from '../../../database/entities/dynamic-question.entity';
import { QuestionType } from '../../../database/entities/enums';
import { EvidenceWorkEntity } from '../../../database/entities/evidence-work.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { PresentationHallEntity } from '../../../database/entities/presentation-hall.entity';
import { RoomProfessorEntity } from '../../../database/entities/room-professor.entity';
import { ProfessorAvailabilityEntity } from '../../../database/entities/professor-availability.entity';
import { WorkGroupEntity } from '../../../database/entities/work-group.entity';
import { RoomWorkEntity } from '../../../database/entities/room-work.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import {
  EvidenceWorkStatus,
  RoomType,
  WorkCategory,
  WorkType,
} from '../../../database/entities/enums';
import { AuditService } from '../../audit/audit.service';
import type { RequestContext } from '../../../common/http/request-context';

const MIN_PROFESSORS_PER_BANCA = 2;
const MAX_PROFESSORS_PER_BANCA = 3;

/** Máximo de trabalhos por tipo de sala quando não configurado na sala. */
const DEFAULT_MAX_BY_TIPO: Record<RoomType, number> = {
  [RoomType.GERAL]:        10,
  [RoomType.MOSTRA_JOGOS]: 10,
  [RoomType.PRATICO]:       5,
  [RoomType.ARTIGO_TCC]:   10,
  [RoomType.IC]:            10,
};

/** Classifica um trabalho no tipo de sala adequado. */
function tipoSalaParaTrabalho(work: EvidenceWorkEntity): RoomType {
  if (work.categoria === WorkCategory.MOSTRA_JOGOS) return RoomType.MOSTRA_JOGOS;
  switch (work.tipoTrabalho) {
    case WorkType.DESENVOLVIMENTO_PRATICO: return RoomType.PRATICO;
    case WorkType.TCC:                     return RoomType.ARTIGO_TCC;
    case WorkType.PESQUISA:                return RoomType.ARTIGO_TCC;
    case WorkType.INICIACAO_CIENTIFICA:    return RoomType.IC;
    default:                               return RoomType.GERAL;
  }
}

@Injectable()
export class LotteryService {
  constructor(
    @InjectRepository(EvidenceWorkEntity)
    private readonly works: Repository<EvidenceWorkEntity>,
    @InjectRepository(PresentationRoomEntity)
    private readonly rooms: Repository<PresentationRoomEntity>,
    @InjectRepository(PresentationHallEntity)
    private readonly halls: Repository<PresentationHallEntity>,
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

  async runLottery(dataEvento: string, executorId: number, ctx?: RequestContext) {
    // ── 1. Limpar sorteio anterior ────────────────────────────────────────────
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

    // ── 2. Trabalhos aprovados ────────────────────────────────────────────────
    const approvedWorks = await this.works.find({
      where: { status: EvidenceWorkStatus.APROVADO, deletedAt: IsNull() },
      relations: ['aluno'],
    });
    if (approvedWorks.length === 0) {
      throw new BadRequestException('Nenhum trabalho aprovado encontrado para o sorteio.');
    }

    // ── 3. Salas físicas cadastradas ─────────────────────────────────────────
    const allHalls = await this.halls.find({ order: { tipoSala: 'ASC', nome: 'ASC' } });

    // ── 4. Construir plano de distribuição ───────────────────────────────────
    const plan = this.buildDistributionPlan(approvedWorks, allHalls);

    // ── 5. Professores disponíveis ────────────────────────────────────────────
    const avails     = await this.availabilities.find({ where: { dataEvento }, relations: ['professor'] });
    const professors = avails.map((a) => a.professor);
    const profsNeeded = plan.length * MIN_PROFESSORS_PER_BANCA;

    if (professors.length < profsNeeded) {
      const faltam = profsNeeded - professors.length;
      throw new BadRequestException(
        `Professores insuficientes para o sorteio.\n` +
        `Salas planejadas: ${plan.length} · Professores disponíveis: ${professors.length} · ` +
        `Necessário: ${profsNeeded} (mínimo ${MIN_PROFESSORS_PER_BANCA} por sala).\n` +
        `Cadastre mais ${faltam} professor(es) disponível(is) para ${dataEvento}.`,
      );
    }

    // ── 6. Criar salas e atribuir bancas ─────────────────────────────────────
    const savedRooms: PresentationRoomEntity[] = [];
    let   professorIndex = 0;
    const assignedProfIds = new Set<number>(); // professor só pode estar em 1 sala/dia

    for (const slot of plan) {
      if (slot.works.length === 0) continue;

      // Professores elegíveis: não usados + cursoBase diferente dos trabalhos do slot
      const coursesInSlot = new Set(slot.works.map((w) => (w.cursoTrabalho ?? '').toLowerCase()));
      const eligible      = professors.filter(
        (p) => !assignedProfIds.has(p.id) && !coursesInSlot.has((p.cursoBase ?? '').toLowerCase()),
      );

      if (eligible.length < MIN_PROFESSORS_PER_BANCA) continue; // slot sem banca → pular

      const rotated   = this.rotateArray(eligible, professorIndex);
      const bancaSize = Math.min(MAX_PROFESSORS_PER_BANCA, rotated.length);
      const banca     = rotated.slice(0, bancaSize);
      const lider     = banca[0];

      professorIndex = (professorIndex + bancaSize) % professors.length;
      for (const p of banca) assignedProfIds.add(p.id);

      const room = await this.rooms.save(
        this.rooms.create({
          dataEvento,
          tipoSala:        slot.tipoSala,
          hallId:          slot.hall?.id ?? null,
          professorLiderId: lider.id,
          fechada:         false,
        }),
      );

      for (let i = 0; i < slot.works.length; i++) {
        await this.roomWorks.save(
          this.roomWorks.create({ salaId: room.id, trabalhoId: slot.works[i].id, ordem: i + 1 }),
        );
        await this.groups.save(
          this.groups.create({ alunoId: slot.works[i].alunoId, trabalhoId: slot.works[i].id }),
        );
      }

      for (const prof of banca) {
        await this.roomProfessors.save(
          this.roomProfessors.create({ salaId: room.id, professorId: prof.id }),
        );
      }

      savedRooms.push(room);
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
      message:
        savedRooms.length === 0
          ? 'Nenhuma sala criada. Verifique professores disponíveis e configuração de salas.'
          : `Sorteio concluído: ${savedRooms.length} sala(s) criada(s).`,
    };
  }

  /**
   * Constrói o plano de distribuição: para cada slot, qual sala física, tipo e
   * lista de trabalhos. Lança erro descritivo se faltar salas físicas.
   */
  private buildDistributionPlan(
    approvedWorks: EvidenceWorkEntity[],
    allHalls: PresentationHallEntity[],
  ): { hall: PresentationHallEntity | null; tipoSala: RoomType; works: EvidenceWorkEntity[] }[] {
    // Agrupar trabalhos por tipo de sala-alvo
    const worksByType = new Map<RoomType, EvidenceWorkEntity[]>();
    for (const w of approvedWorks) {
      const t = tipoSalaParaTrabalho(w);
      if (!worksByType.has(t)) worksByType.set(t, []);
      worksByType.get(t)!.push(w);
    }

    // Agrupar salas físicas por tipo (null/GERAL agrupa junto em GERAL)
    const hallsByType = new Map<RoomType, PresentationHallEntity[]>();
    for (const h of allHalls) {
      const key = h.tipoSala ?? RoomType.GERAL;
      if (!hallsByType.has(key)) hallsByType.set(key, []);
      hallsByType.get(key)!.push(h);
    }

    const plan:    { hall: PresentationHallEntity | null; tipoSala: RoomType; works: EvidenceWorkEntity[] }[] = [];
    const errors:  string[] = [];
    const usedHallIds = new Set<number>();

    for (const [tipo, works] of worksByType.entries()) {
      if (works.length === 0) continue;

      // Buscar salas do tipo específico; fallback para GERAL
      const dedicatedHalls = hallsByType.get(tipo) ?? [];
      const geralHalls     = hallsByType.get(RoomType.GERAL) ?? [];
      const availableHalls = dedicatedHalls.length > 0 ? dedicatedHalls : geralHalls;

      const shuffledWorks = this.shuffle([...works]);

      if (allHalls.length === 0) {
        // Sem salas cadastradas → criar salas virtuais (sem hall físico)
        const maxPer  = DEFAULT_MAX_BY_TIPO[tipo];
        const chunks  = this.distributeEvenly(shuffledWorks, Math.ceil(shuffledWorks.length / maxPer));
        for (const chunk of chunks) plan.push({ hall: null, tipoSala: tipo, works: chunk });
        continue;
      }

      if (availableHalls.length === 0) {
        errors.push(
          `• "${tipo}": ${works.length} trabalho(s) sem sala física configurada. ` +
          `Configure uma sala com tipo "${tipo}" em Configurações → Setores e Salas.`,
        );
        continue;
      }

      // Calcular distribuição
      const freeHalls = availableHalls.filter((h) => !usedHallIds.has(h.id));
      if (freeHalls.length === 0) {
        errors.push(`• "${tipo}": ${shuffledWorks.length} trabalho(s) sem sala disponível.`);
        continue;
      }

      // Capacidade por sala
      const maxPerHall = (h: PresentationHallEntity) => h.maxTrabalhos ?? DEFAULT_MAX_BY_TIPO[tipo];
      const totalCapacity = freeHalls.reduce((s, h) => s + maxPerHall(h), 0);

      if (totalCapacity < shuffledWorks.length) {
        errors.push(
          `• "${tipo}": ${shuffledWorks.length} trabalho(s), capacidade das salas: ${totalCapacity} ` +
          `(${freeHalls.length} sala(s)). Adicione mais salas ou aumente o máximo por sala.`,
        );
        continue;
      }

      // Distribuir igualmente entre as salas disponíveis até atingir capacidade
      let remaining = [...shuffledWorks];
      for (const hall of freeHalls) {
        if (remaining.length === 0) break;
        const max   = maxPerHall(hall);
        const chunk = remaining.splice(0, max);
        plan.push({ hall, tipoSala: tipo, works: chunk });
        usedHallIds.add(hall.id);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Não foi possível executar o sorteio. Corrija os problemas abaixo:\n\n${errors.join('\n')}`,
      );
    }

    return plan;
  }

  /** Preview do plano sem executar — usado pela view para mostrar o cálculo. */
  async getLotteryPreview(dataEvento: string) {
    const works    = await this.works.find({
      where: { status: EvidenceWorkStatus.APROVADO, deletedAt: IsNull() },
    });
    const allHalls = await this.halls.find({ order: { tipoSala: 'ASC', nome: 'ASC' } });
    const avails   = await this.availabilities.find({ where: { dataEvento } });

    // Contar trabalhos por tipo
    const countByType: Record<string, number> = {};
    for (const w of works) {
      const t = tipoSalaParaTrabalho(w);
      countByType[t] = (countByType[t] ?? 0) + 1;
    }

    // Calcular salas necessárias por tipo
    const neededByType: Record<string, { salas: number; capacidade: number }> = {};
    const hallsByType = new Map<RoomType, PresentationHallEntity[]>();
    for (const h of allHalls) {
      const key = h.tipoSala ?? RoomType.GERAL;
      if (!hallsByType.has(key)) hallsByType.set(key, []);
      hallsByType.get(key)!.push(h);
    }

    for (const [tipo, count] of Object.entries(countByType)) {
      const dedicated    = hallsByType.get(tipo as RoomType) ?? [];
      const geral        = hallsByType.get(RoomType.GERAL) ?? [];
      const usableHalls  = dedicated.length > 0 ? dedicated : geral;
      const maxPerHall   = (h: PresentationHallEntity) =>
        h.maxTrabalhos ?? DEFAULT_MAX_BY_TIPO[tipo as RoomType] ?? 10;
      const totalCap     = usableHalls.reduce((s, h) => s + maxPerHall(h), 0);
      const salasNeeded  = allHalls.length === 0
        ? Math.ceil(count / (DEFAULT_MAX_BY_TIPO[tipo as RoomType] ?? 10))
        : Math.min(usableHalls.length, Math.ceil(count / (maxPerHall(usableHalls[0] ?? {} as any) || 10)));

      neededByType[tipo] = { salas: salasNeeded, capacidade: totalCap };
    }

    return {
      totalWorks:         works.length,
      profsDisponiveis:   avails.length,
      totalSalasNecessarias: Object.values(neededByType).reduce((s, v) => s + v.salas, 0),
      hallsConfiguradas:  allHalls.length,
      porTipo: Object.entries(countByType).map(([tipo, count]) => ({
        tipo,
        trabalhos: count,
        salas:     neededByType[tipo]?.salas ?? 0,
        capacidade: neededByType[tipo]?.capacidade ?? 0,
      })),
    };
  }

  async getRooms(dataEvento: string) {
    return this.rooms.find({
      where: { dataEvento },
      relations: ['hall', 'professorLider', 'banca', 'banca.professor', 'works', 'works.trabalho', 'works.trabalho.aluno'],
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

      const evalStatus = (questionIds: number[]) => {
        if (!questionIds.length) return { total: profIds.length, done: 0, pending: banca.map((rp) => rp.professor), overall: 'sem_perguntas' as const };
        const trabIds   = room.works.map((rw) => rw.trabalhoId);
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
          profsDone.length === 0            ? 'nao_iniciado' :
          profsDone.length < profIds.length ? 'parcial'       : 'completo';

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
      const entry = await this.roomProfessors.findOne({ where: { salaId: r.id, professorId: oldProfessorId } });
      if (!entry) continue;
      await this.roomProfessors.delete({ salaId: r.id, professorId: oldProfessorId });
      await this.roomProfessors.save(this.roomProfessors.create({ salaId: r.id, professorId: newProfessorId }));
      if (r.professorLiderId === oldProfessorId) await this.rooms.update(r.id, { professorLiderId: newProfessorId });
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

  private distributeEvenly<T>(arr: T[], numGroups: number): T[][] {
    if (numGroups <= 0) return [];
    const groups: T[][] = Array.from({ length: numGroups }, () => []);
    arr.forEach((item, i) => groups[i % numGroups]!.push(item));
    return groups;
  }
}
