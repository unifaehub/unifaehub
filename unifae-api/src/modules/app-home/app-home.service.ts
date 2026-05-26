import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, isAbsolute, join } from 'path';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  ExerciseCategoryEntity,
  CategoryEntity,
  PatientEntity,
  PatientExecutionEntity,
  PatientPainLogEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  PatientAppointmentEntity,
  MotivationalMessageEntity,
  UserEntity,
  UserSpecialtyEntity,
} from '../../database/entities';
import {
  AppointmentModality,
  AppointmentStatus,
  ExecutionStatus,
  PatientPainLevel,
  PrescriptionStatus,
  UserRole,
} from '../../database/entities/enums';
import { SubmitExerciseFeedbackDto } from './dto/submit-exercise-feedback.dto';
import {
  normalizeStepDescriptions,
  stepsToInstructionsText,
} from '../../shared/prescription-item-steps.util';
import { mapAppointmentLocation } from '../../shared/appointment-location.util';

type HomeSnapshot = {
  painToday: { recorded: boolean; level: PatientPainLevel | null; recordedAt: string | null };
  plan: { totalExercises: number; completedExercises: number; percentCompleted: number };
  nextExercise: null | {
    prescriptionId: number;
    prescriptionItemId: number;
    exerciseId: number;
    exerciseName: string;
    axis: string | null;
    problem: string | null;
    objective: string | null;
  };
  motivation: { id: number; message: string } | null;
};

@Injectable()
export class AppHomeService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(PatientPainLogEntity)
    private readonly painLogs: Repository<PatientPainLogEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptions: Repository<PrescriptionEntity>,
    @InjectRepository(PrescriptionItemEntity)
    private readonly prescriptionItems: Repository<PrescriptionItemEntity>,
    @InjectRepository(PatientExecutionEntity)
    private readonly executions: Repository<PatientExecutionEntity>,
    @InjectRepository(ExerciseCategoryEntity)
    private readonly exerciseCategories: Repository<ExerciseCategoryEntity>,
    @InjectRepository(MotivationalMessageEntity)
    private readonly motivationalMessages: Repository<MotivationalMessageEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(UserSpecialtyEntity)
    private readonly userSpecialties: Repository<UserSpecialtyEntity>,
    @InjectRepository(PatientAppointmentEntity)
    private readonly appointments: Repository<PatientAppointmentEntity>,
    private readonly config: ConfigService,
  ) {}

  private dayKeyLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private localDayRange(now: Date) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }

  private uploadRoot(): string {
    const raw = this.config.get<string>('uploads.root') ?? 'uploads';
    return isAbsolute(raw) ? raw : join(process.cwd(), raw);
  }

  private profilePhotosDir(): string {
    return join(this.uploadRoot(), 'profiles');
  }

  private profilePhotoUrl(userId: number): string {
    return `/api/v1/app/home/profile/photo/${userId}`;
  }

  private async removeFileIfExists(path: string) {
    await unlink(path).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }

  private async loadPatientForActor(actor: UserEntity): Promise<PatientEntity> {
    if (actor.role !== UserRole.PATIENT) {
      throw new BadRequestException('Acesso exclusivo do aplicativo do paciente.');
    }
    const row = await this.patients.findOne({
      where: { userId: actor.id },
      relations: { user: true, course: true, app: true },
    });
    if (!row || !row.user || row.user.deletedAt) {
      throw new BadRequestException('Paciente inválido.');
    }
    return row;
  }

  async submitPain(actor: UserEntity, level: PatientPainLevel) {
    const patient = await this.loadPatientForActor(actor);
    const now = new Date();
    const day = this.dayKeyLocal(now);
    const existing = await this.painLogs.findOne({ where: { patientId: patient.id, day } });
    if (existing) {
      return {
        recorded: false,
        message: 'Você já registrou sua sensação de dor hoje.',
        painToday: { recorded: true, level: existing.level, recordedAt: existing.reportedAt.toISOString() },
      };
    }
    const saved = await this.painLogs.save(
      this.painLogs.create({
        patientId: patient.id,
        day,
        reportedAt: now,
        level,
      }),
    );
    return {
      recorded: true,
      message: 'Registro de dor do dia salvo.',
      painToday: { recorded: true, level: saved.level, recordedAt: saved.reportedAt.toISOString() },
    };
  }

  async getMotivation(): Promise<{ id: number; message: string } | null> {
    // MySQL: ORDER BY RAND() é simples; volume tende a ser pequeno.
    const row = await this.motivationalMessages
      .createQueryBuilder('m')
      .where('m.active = true')
      .orderBy('RAND()')
      .limit(1)
      .getOne();
    return row ? { id: row.id, message: row.message } : null;
  }

  private metaFromExerciseCategoryRows(
    ecs: ExerciseCategoryEntity[],
  ): { axis: string | null; problem: string | null; objective: string | null } {
    const categories = ecs.flatMap((ec) => {
      const out: CategoryEntity[] = [];
      let current: CategoryEntity | null | undefined = ec.category;
      while (current) {
        out.push(current);
        current = current.parent;
      }
      return out;
    });
    const pick = (...keys: string[]) =>
      categories.find((category) => keys.includes(category.categoryTypeDefinition?.key ?? ''))?.name ?? null;
    return {
      axis: pick('axis', 'eixo'),
      problem: pick('problem', 'problema'),
      objective: pick('objective', 'objetivo'),
    };
  }

  private async resolveExerciseMeta(
    exerciseId: number,
  ): Promise<{ axis: string | null; problem: string | null; objective: string | null }> {
    const ecs = await this.exerciseCategories.find({
      where: { exerciseId },
      relations: {
        category: {
          categoryTypeDefinition: true,
          parent: {
            categoryTypeDefinition: true,
            parent: { categoryTypeDefinition: true, parent: { categoryTypeDefinition: true } },
          },
        },
      },
    });
    return this.metaFromExerciseCategoryRows(ecs);
  }

  private async coordinatorSpecialties(userId: number) {
    const rows = await this.userSpecialties.find({
      where: { userId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      isPrimary: s.isPrimary,
    }));
  }

  /** Interpreta `prescription_items.repetitions` quando no formato "3x15". Caso contrário, devolve texto em `volume`. */
  private parseMetricsFromRepetitionsField(raw: string | null): {
    series: string | null;
    volume: string | null;
    raw: string | null;
  } {
    if (!raw?.trim()) return { series: null, volume: null, raw: null };
    const t = raw.trim();
    const m = t.match(/^(\d+)\s*[xX×]\s*(\d+)$/);
    if (m) {
      return { series: m[1], volume: m[2], raw: t };
    }
    return { series: null, volume: t, raw: t };
  }

  private async loadApprovedPrescriptionForPatient(patient: PatientEntity) {
    return this.prescriptions.findOne({
      where: { patientId: patient.id, appId: patient.appId, status: PrescriptionStatus.APPROVED },
      order: { decidedAt: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });
  }

  /**
   * Lista todo o plano de exercícios da prescrição ativa (para lista / agenda no app).
   */
  async listPlanExercises(actor: UserEntity) {
    const patient = await this.loadPatientForActor(actor);
    const rx = await this.loadApprovedPrescriptionForPatient(patient);
    if (!rx) {
      return { prescriptionId: null as number | null, items: [] as Record<string, unknown>[] };
    }

    const items = await this.prescriptionItems.find({
      where: { prescriptionId: rx.id },
      relations: { exercise: true },
      order: { id: 'ASC' },
    });
    if (!items.length) {
      return { prescriptionId: rx.id, items: [] };
    }

    const now = new Date();
    const { start, end } = this.localDayRange(now);
    const itemIds = items.map((i) => i.id);
    const doneTodayRows = await this.executions
      .createQueryBuilder('e')
      .select('e.prescriptionItemId', 'itemId')
      .where('e.patientId = :pid', { pid: patient.id })
      .andWhere('e.prescriptionItemId IN (:...itemIds)', { itemIds })
      .andWhere('e.performedAt >= :start AND e.performedAt < :end', { start, end })
      .andWhere('e.status = :st', { st: ExecutionStatus.COMPLETED })
      .groupBy('e.prescriptionItemId')
      .getRawMany<{ itemId: string }>();
    const doneToday = new Set(doneTodayRows.map((r) => Number(r.itemId)));

    const exerciseIds = [...new Set(items.map((i) => i.exerciseId))];
    const allEc =
      exerciseIds.length > 0
        ? await this.exerciseCategories.find({
            where: { exerciseId: In(exerciseIds) },
            relations: {
              category: {
                categoryTypeDefinition: true,
                parent: {
                  categoryTypeDefinition: true,
                  parent: { categoryTypeDefinition: true, parent: { categoryTypeDefinition: true } },
                },
              },
            },
          })
        : [];
    const byEx = new Map<number, ExerciseCategoryEntity[]>();
    for (const ec of allEc) {
      const arr = byEx.get(ec.exerciseId) ?? [];
      arr.push(ec);
      byEx.set(ec.exerciseId, arr);
    }

    const rows = items.map((it) => {
      const ecs = byEx.get(it.exerciseId) ?? [];
      const meta = this.metaFromExerciseCategoryRows(ecs);
      return {
        prescriptionItemId: it.id,
        exerciseId: it.exerciseId,
        title: it.exercise?.name ?? '—',
        taxonomy: {
          axis: meta.axis,
          problem: meta.problem,
          objective: meta.objective,
        },
        completedToday: doneToday.has(it.id),
      };
    });

    return { prescriptionId: rx.id, items: rows };
  }

  /**
   * Detalhe de um item do plano (tela do exercício: vídeo, passo a passo, dicas, métricas).
   */
  async getPlanExerciseDetail(actor: UserEntity, prescriptionItemId: number) {
    const patient = await this.loadPatientForActor(actor);
    const rx = await this.loadApprovedPrescriptionForPatient(patient);
    if (!rx) {
      throw new NotFoundException('Não há prescrição aprovada.');
    }

    const item = await this.prescriptionItems.findOne({
      where: { id: prescriptionItemId, prescriptionId: rx.id },
      relations: { exercise: true, steps: true },
    });
    if (!item?.exercise) {
      throw new NotFoundException('Exercício não encontrado neste plano.');
    }

    const ecs = await this.exerciseCategories.find({
      where: { exerciseId: item.exerciseId },
      relations: {
        category: {
          categoryTypeDefinition: true,
          parent: {
            categoryTypeDefinition: true,
            parent: { categoryTypeDefinition: true, parent: { categoryTypeDefinition: true } },
          },
        },
      },
    });
    const meta = this.metaFromExerciseCategoryRows(ecs);

    const catalogInstructions = item.exercise.instructions?.trim() || null;
    const itemInstructions = item.instructions?.trim() || null;
    const dbSteps = [...(item.steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const steps =
      dbSteps.length > 0
        ? dbSteps.map((step) => ({ order: step.sortOrder, text: step.description }))
        : normalizeStepDescriptions(undefined, itemInstructions ?? catalogInstructions);
    const effectiveInstructions =
      stepsToInstructionsText(steps) ?? itemInstructions ?? catalogInstructions;

    const metrics = this.parseMetricsFromRepetitionsField(item.repetitions);

    return {
      prescriptionId: rx.id,
      prescriptionItemId: item.id,
      exerciseId: item.exerciseId,
      title: item.exercise.name,
      videoUrl: item.exercise.videoUrl,
      description: item.exercise.description,
      taxonomy: {
        axis: meta.axis,
        problem: meta.problem,
        objective: meta.objective,
      },
      metrics: {
        repetitionsRaw: item.repetitions,
        series: metrics.series,
        volume: metrics.volume,
      },
      /** Etapas ordenadas do passo a passo (prioriza prescrição; fallback parse do texto legado). */
      steps,
      /** Texto legado agregado (1. …\\n2. …); útil para clientes antigos. */
      instructions: effectiveInstructions,
      /** Observações / dicas do profissional por item de prescrição. */
      physiotherapistNotes: item.notes,
    };
  }

  /**
   * Confirma conclusão do exercício (uma linha em `patient_executions`).
   * O app deve usar o `executionId` retornado ao enviar o feedback da sessão.
   */
  async completePlanExercise(actor: UserEntity, prescriptionItemId: number) {
    const patient = await this.loadPatientForActor(actor);
    const rx = await this.loadApprovedPrescriptionForPatient(patient);
    if (!rx) {
      throw new NotFoundException('Não há prescrição aprovada.');
    }

    const item = await this.prescriptionItems.findOne({
      where: { id: prescriptionItemId, prescriptionId: rx.id },
    });
    if (!item) {
      throw new NotFoundException('Exercício não encontrado neste plano.');
    }

    const now = new Date();
    const row = this.executions.create({
      patientId: patient.id,
      prescriptionItemId: item.id,
      performedAt: now,
      status: ExecutionStatus.COMPLETED,
      feedback: null,
      postExerciseScore: null,
      feedbackRecordedAt: null,
    });
    const saved = await this.executions.save(row);

    return {
      executionId: saved.id,
      prescriptionId: rx.id,
      prescriptionItemId: item.id,
      exerciseId: item.exerciseId,
      performedAt: saved.performedAt.toISOString(),
      message: 'Execução registrada. Envie o feedback desta sessão em seguida.',
    };
  }

  /**
   * Feedback pós-exercício (escala + observações), amarrado ao registro de execução.
   */
  async submitExecutionFeedback(actor: UserEntity, executionId: number, dto: SubmitExerciseFeedbackDto) {
    const patient = await this.loadPatientForActor(actor);
    const rx = await this.loadApprovedPrescriptionForPatient(patient);
    if (!rx) {
      throw new NotFoundException('Não há prescrição aprovada.');
    }

    const row = await this.executions.findOne({
      where: { id: executionId, patientId: patient.id },
    });
    if (!row) {
      throw new NotFoundException('Registro de execução não encontrado.');
    }
    const item = await this.prescriptionItems.findOne({
      where: { id: row.prescriptionItemId, prescriptionId: rx.id },
    });
    if (!item) {
      throw new NotFoundException('Registro de execução não encontrado neste plano.');
    }
    if (row.postExerciseScore != null) {
      throw new ConflictException('Feedback já registrado para esta execução.');
    }

    const notes = dto.notes?.trim() ? dto.notes.trim() : null;
    const recordedAt = new Date();

    row.postExerciseScore = dto.score;
    row.feedback = notes;
    row.feedbackRecordedAt = recordedAt;
    await this.executions.save(row);

    return {
      executionId: row.id,
      prescriptionItemId: row.prescriptionItemId,
      score: row.postExerciseScore,
      notes: row.feedback,
      feedbackRecordedAt: row.feedbackRecordedAt.toISOString(),
    };
  }

  private weekRangeLocal(anchor = new Date()) {
    const d = new Date(anchor);
    const dow = d.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const start = new Date(d);
    start.setDate(d.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  private dayLabelPt(date: Date): string {
    const labels = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    return labels[date.getDay()] ?? '—';
  }

  private executionState(row: PatientExecutionEntity | undefined) {
    if (!row) {
      return {
        completed: false,
        executionId: null as number | null,
        performedAt: null as string | null,
        feedbackSubmitted: false,
        feedbackScore: null as number | null,
        feedbackRecordedAt: null as string | null,
        feedbackPending: false,
      };
    }
    const feedbackSubmitted = row.postExerciseScore != null;
    return {
      completed: row.status === ExecutionStatus.COMPLETED,
      executionId: row.id,
      performedAt: row.performedAt.toISOString(),
      feedbackSubmitted,
      feedbackScore: row.postExerciseScore,
      feedbackRecordedAt: row.feedbackRecordedAt?.toISOString() ?? null,
      feedbackPending: row.status === ExecutionStatus.COMPLETED && !feedbackSubmitted,
    };
  }

  private async loadExerciseCategoriesMap(exerciseIds: number[]) {
    const allEc =
      exerciseIds.length > 0
        ? await this.exerciseCategories.find({
            where: { exerciseId: In(exerciseIds) },
            relations: {
              category: {
                categoryTypeDefinition: true,
                parent: {
                  categoryTypeDefinition: true,
                  parent: { categoryTypeDefinition: true, parent: { categoryTypeDefinition: true } },
                },
              },
            },
          })
        : [];
    const byEx = new Map<number, ExerciseCategoryEntity[]>();
    for (const ec of allEc) {
      const arr = byEx.get(ec.exerciseId) ?? [];
      arr.push(ec);
      byEx.set(ec.exerciseId, arr);
    }
    return byEx;
  }

  private mapAppointmentItem(row: PatientAppointmentEntity) {
    return {
      id: row.id,
      scheduledAt: row.scheduledAt.toISOString(),
      durationMinutes: row.durationMinutes,
      modality: row.modality,
      status: row.status,
      professional: row.professional
        ? { id: row.professional.id, name: row.professional.name, email: row.professional.email }
        : null,
      location: mapAppointmentLocation({
        modality: row.modality,
        careLocation: row.careLocation,
        meetUrl: row.meetUrl,
      }),
      notes: row.notes,
    };
  }

  private groupAppointmentsByDay(rows: PatientAppointmentEntity[], rangeStart: Date, rangeEnd: Date) {
    const map = new Map<string, ReturnType<AppHomeService['mapAppointmentItem']>[]>();
    for (const row of rows) {
      if (row.scheduledAt < rangeStart || row.scheduledAt >= rangeEnd) continue;
      const date = this.dayKeyLocal(row.scheduledAt);
      const list = map.get(date) ?? [];
      list.push(this.mapAppointmentItem(row));
      map.set(date, list);
    }
    return map;
  }

  private buildItemDetail(
    item: PrescriptionItemEntity,
    meta: { axis: string | null; problem: string | null; objective: string | null },
    execution: ReturnType<AppHomeService['executionState']>,
  ) {
    const catalogInstructions = item.exercise?.instructions?.trim() || null;
    const itemInstructions = item.instructions?.trim() || null;
    const dbSteps = [...(item.steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const steps =
      dbSteps.length > 0
        ? dbSteps.map((step) => ({ order: step.sortOrder, text: step.description }))
        : normalizeStepDescriptions(undefined, itemInstructions ?? catalogInstructions);
    const effectiveInstructions =
      stepsToInstructionsText(steps) ?? itemInstructions ?? catalogInstructions;
    const metrics = this.parseMetricsFromRepetitionsField(item.repetitions);

    return {
      prescriptionItemId: item.id,
      exerciseId: item.exerciseId,
      title: item.exercise?.name ?? '—',
      videoUrl: item.exercise?.videoUrl ?? null,
      description: item.exercise?.description ?? null,
      taxonomy: { axis: meta.axis, problem: meta.problem, objective: meta.objective },
      metrics: {
        repetitionsRaw: item.repetitions,
        series: metrics.series,
        volume: metrics.volume,
      },
      steps,
      instructions: effectiveInstructions,
      physiotherapistNotes: item.notes,
      execution,
    };
  }

  private async loadLatestExecutionsByDay(
    patientId: number,
    itemIds: number[],
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const map = new Map<string, Map<number, PatientExecutionEntity>>();
    if (!itemIds.length) return map;

    const rows = await this.executions
      .createQueryBuilder('e')
      .where('e.patientId = :pid', { pid: patientId })
      .andWhere('e.prescriptionItemId IN (:...itemIds)', { itemIds })
      .andWhere('e.performedAt >= :start AND e.performedAt < :end', {
        start: rangeStart,
        end: rangeEnd,
      })
      .orderBy('e.performedAt', 'DESC')
      .getMany();

    for (const row of rows) {
      const day = this.dayKeyLocal(row.performedAt);
      const byItem = map.get(day) ?? new Map<number, PatientExecutionEntity>();
      if (!byItem.has(row.prescriptionItemId)) {
        byItem.set(row.prescriptionItemId, row);
      }
      map.set(day, byItem);
    }
    return map;
  }

  /** Plano do dia com detalhes completos e status de execução/feedback. */
  async getPlanToday(actor: UserEntity) {
    const patient = await this.loadPatientForActor(actor);
    const now = new Date();
    const date = this.dayKeyLocal(now);
    const { start, end } = this.localDayRange(now);

    const rx = await this.loadApprovedPrescriptionForPatient(patient);
    if (!rx) {
      return {
        date,
        prescriptionId: null,
        summary: { total: 0, completed: 0, pendingFeedback: 0, percentCompleted: 0 },
        exercises: [] as Record<string, unknown>[],
      };
    }

    const items = await this.prescriptionItems.find({
      where: { prescriptionId: rx.id },
      relations: { exercise: true, steps: true },
      order: { id: 'ASC' },
    });
    const exerciseIds = [...new Set(items.map((i) => i.exerciseId))];
    const byEx = await this.loadExerciseCategoriesMap(exerciseIds);
    const execByDay = await this.loadLatestExecutionsByDay(
      patient.id,
      items.map((i) => i.id),
      start,
      end,
    );
    const todayExec = execByDay.get(date) ?? new Map();

    const exercises = items.map((it) => {
      const meta = this.metaFromExerciseCategoryRows(byEx.get(it.exerciseId) ?? []);
      const execution = this.executionState(todayExec.get(it.id));
      return this.buildItemDetail(it, meta, execution);
    });

    const completed = exercises.filter((e) => e.execution.completed).length;
    const pendingFeedback = exercises.filter((e) => e.execution.feedbackPending).length;
    const total = exercises.length;

    return {
      date,
      prescriptionId: rx.id,
      summary: {
        total,
        completed,
        pendingFeedback,
        percentCompleted: total <= 0 ? 0 : Math.round((completed / total) * 100),
      },
      exercises,
    };
  }

  /** Plano semanal da semana corrente (segunda a domingo, com base na data de hoje). */
  async getPlanWeek(actor: UserEntity) {
    const patient = await this.loadPatientForActor(actor);
    const today = new Date();
    const todayKey = this.dayKeyLocal(today);
    const { start, end } = this.weekRangeLocal(today);
    const weekStart = this.dayKeyLocal(start);
    const weekEnd = this.dayKeyLocal(new Date(end.getTime() - 1));

    const apptRows = await this.appointments.find({
      where: { patientId: patient.id, status: AppointmentStatus.SCHEDULED },
      relations: { professional: true, careLocation: true },
      order: { scheduledAt: 'ASC' },
    });
    const apptsByDay = this.groupAppointmentsByDay(apptRows, start, end);

    const rx = await this.loadApprovedPrescriptionForPatient(patient);
    const items = rx
      ? await this.prescriptionItems.find({
          where: { prescriptionId: rx.id },
          relations: { exercise: true, steps: true },
          order: { id: 'ASC' },
        })
      : [];
    const exerciseIds = [...new Set(items.map((i) => i.exerciseId))];
    const byEx = await this.loadExerciseCategoriesMap(exerciseIds);
    const execByDay = await this.loadLatestExecutionsByDay(
      patient.id,
      items.map((i) => i.id),
      start,
      end,
    );

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + i);
      const date = this.dayKeyLocal(dayDate);
      const dayExec = execByDay.get(date) ?? new Map();

      const exercises = items.map((it) => {
        const meta = this.metaFromExerciseCategoryRows(byEx.get(it.exerciseId) ?? []);
        const execution = this.executionState(dayExec.get(it.id));
        return this.buildItemDetail(it, meta, execution);
      });

      const completed = exercises.filter((e) => e.execution.completed).length;
      const pendingFeedback = exercises.filter((e) => e.execution.feedbackPending).length;

      days.push({
        date,
        label: this.dayLabelPt(dayDate),
        isToday: date === todayKey,
        summary: {
          total: exercises.length,
          completed,
          pendingFeedback,
          percentCompleted:
            exercises.length <= 0 ? 0 : Math.round((completed / exercises.length) * 100),
        },
        exercises,
        appointments: apptsByDay.get(date) ?? [],
      });
    }

    return {
      today: todayKey,
      weekStart,
      weekEnd,
      prescriptionId: rx?.id ?? null,
      days,
    };
  }

  /** Agendas futuras do paciente (online ou presencial). */
  async listAppointments(actor: UserEntity) {
    const patient = await this.loadPatientForActor(actor);
    const now = new Date();
    const rows = await this.appointments.find({
      where: { patientId: patient.id, status: AppointmentStatus.SCHEDULED },
      relations: { professional: true, careLocation: true },
      order: { scheduledAt: 'ASC' },
      take: 50,
    });

    return {
      items: rows.filter((r) => r.scheduledAt >= now).map((r) => this.mapAppointmentItem(r)),
    };
  }

  async getHomeSnapshot(actor: UserEntity): Promise<HomeSnapshot> {
    const patient = await this.loadPatientForActor(actor);
    const now = new Date();
    const day = this.dayKeyLocal(now);
    const { start, end } = this.localDayRange(now);

    const pain = await this.painLogs.findOne({ where: { patientId: patient.id, day } });

    const approvedPrescription = await this.prescriptions.findOne({
      where: { patientId: patient.id, appId: patient.appId, status: PrescriptionStatus.APPROVED },
      order: { decidedAt: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });

    let totalExercises = 0;
    let completedExercises = 0;
    let nextExercise: HomeSnapshot['nextExercise'] = null;

    if (approvedPrescription) {
      const items = await this.prescriptionItems.find({
        where: { prescriptionId: approvedPrescription.id },
        relations: { exercise: true },
        order: { id: 'ASC' },
      });
      totalExercises = items.length;

      if (items.length) {
        const doneRaw = await this.executions
          .createQueryBuilder('e')
          .select('e.prescriptionItemId', 'itemId')
          .addSelect('MAX(e.performedAt)', 'lastAt')
          .where('e.patientId = :pid', { pid: patient.id })
          .andWhere('e.performedAt >= :start AND e.performedAt < :end', { start, end })
          .andWhere('e.status = :st', { st: ExecutionStatus.COMPLETED })
          .groupBy('e.prescriptionItemId')
          .getRawMany<{ itemId: string; lastAt: string }>();

        const doneSet = new Set<number>(doneRaw.map((r) => Number(r.itemId)));
        completedExercises = doneSet.size;

        const next = items.find((i) => !doneSet.has(i.id)) ?? null;
        if (next && next.exercise) {
          const meta = await this.resolveExerciseMeta(next.exerciseId);
          nextExercise = {
            prescriptionId: approvedPrescription.id,
            prescriptionItemId: next.id,
            exerciseId: next.exerciseId,
            exerciseName: next.exercise.name,
            axis: meta.axis,
            problem: meta.problem,
            objective: meta.objective,
          };
        }
      }
    }

    const percentCompleted =
      totalExercises <= 0 ? 0 : Math.round((completedExercises / totalExercises) * 100);

    const motivation = await this.getMotivation();

    return {
      painToday: {
        recorded: !!pain,
        level: pain?.level ?? null,
        recordedAt: pain?.reportedAt?.toISOString?.() ?? null,
      },
      plan: { totalExercises, completedExercises, percentCompleted },
      nextExercise,
      motivation,
    };
  }

  async getProfile(actor: UserEntity) {
    const patient = await this.loadPatientForActor(actor);
    const { start, end } = this.localDayRange(new Date());
    start.setDate(start.getDate() - 6);

    const me = await this.users.findOne({ where: { id: actor.id } });
    if (!me) throw new BadRequestException('Usuário inválido.');

    const student = patient.studentId
      ? await this.users.findOne({ where: { id: patient.studentId } })
      : null;

    const coordinator = await this.users.findOne({
      where: { role: UserRole.COORDINATOR, appId: patient.appId, courseId: patient.courseId },
      order: { id: 'ASC' },
    });

    const approvedPrescription = await this.prescriptions.findOne({
      where: { patientId: patient.id, appId: patient.appId, status: PrescriptionStatus.APPROVED },
      order: { decidedAt: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });

    let prescribed = 0;
    let completed = 0;
    if (approvedPrescription) {
      const items = await this.prescriptionItems.find({ where: { prescriptionId: approvedPrescription.id } });
      prescribed = items.length;
      if (prescribed > 0) {
        const itemIds = items.map((i) => i.id);
        const rows = await this.executions
          .createQueryBuilder('e')
          .select('e.prescriptionItemId', 'itemId')
          .where('e.patientId = :pid', { pid: patient.id })
          .andWhere('e.prescriptionItemId IN (:...itemIds)', { itemIds })
          .andWhere('e.performedAt >= :start AND e.performedAt < :end', { start, end })
          .andWhere('e.status = :st', { st: ExecutionStatus.COMPLETED })
          .groupBy('e.prescriptionItemId')
          .getRawMany<{ itemId: string }>();
        completed = rows.length;
      }
    }

    const percent = prescribed <= 0 ? 0 : Math.round((completed / prescribed) * 100);

    const coordinatorSpecialties = coordinator ? await this.coordinatorSpecialties(coordinator.id) : [];

    const toMiniUser = (u: UserEntity | null) =>
      u
        ? {
            id: u.id,
            name: u.name,
            email: u.email,
            photoUrl: u.profilePhotoPath ? this.profilePhotoUrl(u.id) : null,
          }
        : null;

    return {
      profile: {
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role,
        photoUrl: me.profilePhotoPath ? this.profilePhotoUrl(me.id) : null,
      },
      app: patient.app ? { id: patient.app.id, name: patient.app.name } : null,
      course: patient.course ? { id: patient.course.id, name: patient.course.name } : { id: patient.courseId },
      responsibleStudent: toMiniUser(student),
      coordinator: coordinator
        ? {
            id: coordinator.id,
            name: coordinator.name,
            email: coordinator.email,
            photoUrl: coordinator.profilePhotoPath ? this.profilePhotoUrl(coordinator.id) : null,
            primarySpecialty:
              coordinatorSpecialties.find((s) => s.isPrimary)?.name ?? coordinatorSpecialties[0]?.name ?? null,
            specialties: coordinatorSpecialties,
          }
        : null,
      weeklyProgress: {
        from: start.toISOString().slice(0, 10),
        to: new Date(end.getTime() - 1).toISOString().slice(0, 10),
        prescribedExercises: prescribed,
        completedExercises: completed,
        percentCompleted: percent,
      },
    };
  }

  async uploadProfilePhoto(actor: UserEntity, file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }) {
    if (!file?.buffer?.length) throw new BadRequestException('Envie uma imagem válida.');
    if (!actor?.id) throw new BadRequestException('Usuário inválido.');

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Formato inválido. Use JPG, PNG ou WEBP.');
    }
    const maxBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxBytes) {
      throw new BadRequestException('A imagem excede 8MB.');
    }

    const user = await this.users.findOne({ where: { id: actor.id } });
    if (!user || user.deletedAt) throw new BadRequestException('Usuário não encontrado.');

    const ext =
      file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const filename = `u${actor.id}-${Date.now()}${ext}`;
    const rel = join('profiles', filename).replace(/\\/g, '/');
    const full = join(this.uploadRoot(), rel);

    await mkdir(this.profilePhotosDir(), { recursive: true });
    await writeFile(full, file.buffer);

    const previousRel = user.profilePhotoPath;
    const previousPath = previousRel ? join(this.uploadRoot(), previousRel) : null;
    user.profilePhotoPath = rel;
    await this.users.save(user);

    if (previousPath) {
      try {
        await this.removeFileIfExists(previousPath);
      } catch (err) {
        user.profilePhotoPath = previousRel;
        await this.users.save(user).catch(() => undefined);
        await this.removeFileIfExists(full).catch(() => undefined);
        throw err;
      }
    }

    return {
      message: 'Foto de perfil atualizada com sucesso.',
      photoUrl: this.profilePhotoUrl(user.id),
    };
  }

  async readProfilePhoto(actor: UserEntity, userId: number) {
    const patient = await this.loadPatientForActor(actor);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.profilePhotoPath || user.deletedAt) {
      throw new BadRequestException('Foto de perfil não encontrada.');
    }
    const coordinator = await this.users.findOne({
      where: { role: UserRole.COORDINATOR, appId: patient.appId, courseId: patient.courseId },
      order: { id: 'ASC' },
    });
    const allowed = new Set<number>([
      actor.id,
      patient.studentId,
      ...(coordinator ? [coordinator.id] : []),
    ]);
    if (!allowed.has(userId)) {
      throw new BadRequestException('Sem permissão para acessar esta foto.');
    }
    const full = join(this.uploadRoot(), user.profilePhotoPath);
    const ext = extname(user.profilePhotoPath).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return {
      stream: createReadStream(full),
      mimeType,
      filename: `perfil-${user.id}${ext || '.jpg'}`,
    };
  }
}

