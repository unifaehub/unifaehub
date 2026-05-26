import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import type { RequestContext } from '../../common/http/request-context';
import { AppEntity } from '../../database/entities/app.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { ExerciseEntity } from '../../database/entities/exercise.entity';
import { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PrescriptionItemEntity } from '../../database/entities/prescription-item.entity';
import { PrescriptionItemStepEntity } from '../../database/entities/prescription-item-step.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CareEpisodeStatus, PrescriptionStatus, UserRole } from '../../database/entities/enums';
import { PaginatedResult } from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionItemInputDto } from './dto/prescription-item-input.dto';
import {
  normalizeStepDescriptions,
  stepsToInstructionsText,
  type PrescriptionStepRow,
} from '../../shared/prescription-item-steps.util';

export type PrescriptionExerciseTaxonomyRow = {
  clinicalCaseName: string | null;
  typeLabel: string;
  typeKey: string;
  categoryName: string;
};

export type PrescriptionItemResponse = {
  id: number;
  exerciseId: number;
  exerciseName: string;
  exerciseDescription: string | null;
  exerciseCatalogInstructions: string | null;
  instructions: string | null;
  steps: PrescriptionStepRow[];
  repetitions: string | null;
  notes: string | null;
  /** Categorias / tipos vinculados ao exercício no catálogo (contexto clínico). */
  exerciseTaxonomy: PrescriptionExerciseTaxonomyRow[];
};

export type PrescriptionSummaryResponse = {
  id: number;
  patientId: number;
  patientName: string;
  courseId: number;
  courseName: string;
  appId: number;
  studentId: number;
  studentName: string;
  professorId: number | null;
  professorName: string | null;
  status: PrescriptionStatus;
  justification: string | null;
  nextVisitDate: string | null;
  createdAt: string;
  itemsCount: number;
  careEpisodeId: number | null;
  careEpisodeTitle: string | null;
};

export type PrescriptionDetailResponse = PrescriptionSummaryResponse & {
  items: PrescriptionItemResponse[];
  patientEmail: string | null;
  studentEmail: string | null;
  professorEmail: string | null;
  appName: string | null;
  /** Nomes dos coordenadores vinculados ao curso (até 8). */
  courseCoordinators: string[];
  careEpisodeStatus?: CareEpisodeStatus | null;
  decidedAt: string | null;
  decidedById: number | null;
  decidedByName: string | null;
};

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptions: Repository<PrescriptionEntity>,
    @InjectRepository(PrescriptionItemEntity)
    private readonly prescriptionItems: Repository<PrescriptionItemEntity>,
    @InjectRepository(PrescriptionItemStepEntity)
    private readonly prescriptionItemSteps: Repository<PrescriptionItemStepEntity>,
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(PatientCareEpisodeEntity)
    private readonly careEpisodes: Repository<PatientCareEpisodeEntity>,
    @InjectRepository(ExerciseEntity)
    private readonly exercises: Repository<ExerciseEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async assertCourseAppMatch(courseId: number, appId: number): Promise<CourseEntity> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new BadRequestException('Curso inválido.');
    const app = await this.apps.findOne({ where: { id: appId } });
    if (!app) throw new BadRequestException('App inválido.');
    if (course.appId == null || course.appId !== appId) {
      throw new BadRequestException('O curso selecionado não pertence a este app.');
    }
    return course;
  }

  private assertActorInCourse(actor: UserEntity, courseId: number, appId: number) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.appId != null && actor.appId !== appId) {
      throw new ForbiddenException('Fora do aplicativo do seu usuário.');
    }
    if (actor.courseId != null && actor.courseId !== courseId) {
      throw new ForbiddenException('Fora do curso do seu usuário.');
    }
  }

  private canApprove(actor: UserEntity): boolean {
    return (
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.COORDINATOR ||
      actor.role === UserRole.PROFESSOR
    );
  }

  private async loadPatientScoped(
    patientId: number,
    courseId: number,
    appId: number,
  ): Promise<PatientEntity> {
    const pt = await this.patients.findOne({
      where: { id: patientId, courseId, appId },
      relations: { user: true, course: true },
    });
    if (!pt || !pt.user || pt.user.deletedAt) {
      throw new BadRequestException('Paciente inválido ou fora do curso/app selecionados.');
    }
    return pt;
  }

  private async validateExerciseIds(exerciseIds: number[], courseId: number, appId: number): Promise<void> {
    const unique = [...new Set(exerciseIds)];
    const rows = await this.exercises.find({
      where: { id: In(unique), courseId, appId },
    });
    if (rows.length !== unique.length) {
      throw new BadRequestException(
        'Um ou mais exercícios são inválidos ou não pertencem a este curso e app.',
      );
    }
  }

  private async validateStudentUser(id: number, courseId: number, appId: number): Promise<void> {
    const u = await this.users.findOne({
      where: { id, role: UserRole.STUDENT, deletedAt: IsNull() },
    });
    if (!u || u.courseId !== courseId || u.appId !== appId) {
      throw new BadRequestException('Estagiário inválido para este curso/app.');
    }
  }

  private async resolveCareEpisodeId(
    patient: PatientEntity,
    explicitId?: number | null,
  ): Promise<number> {
    if (explicitId != null) {
      const ep = await this.careEpisodes.findOne({
        where: { id: explicitId, patientId: patient.id },
      });
      if (!ep) {
        throw new BadRequestException('Episódio de cuidado inválido para este paciente.');
      }
      return ep.id;
    }
    const actives = await this.careEpisodes.find({
      where: { patientId: patient.id, status: CareEpisodeStatus.ACTIVE },
      order: { id: 'DESC' },
    });
    if (actives.length === 1) return actives[0]!.id;
    if (actives.length > 1) {
      throw new BadRequestException(
        'Há mais de um episódio ativo: selecione o episódio desta prescrição (careEpisodeId).',
      );
    }
    const fallback = await this.careEpisodes.find({
      where: { patientId: patient.id },
      order: { startedAt: 'DESC', id: 'DESC' },
      take: 1,
    });
    if (fallback.length === 1) return fallback[0]!.id;
    throw new BadRequestException(
      'Cadastre um episódio de cuidado para o paciente antes de registrar a prescrição.',
    );
  }

  private async validateProfessorUser(
    id: number | null,
    courseId: number,
    appId: number,
  ): Promise<void> {
    if (id == null) return;
    const u = await this.users.findOne({
      where: { id, role: UserRole.PROFESSOR, deletedAt: IsNull() },
    });
    if (!u || u.courseId !== courseId || u.appId !== appId) {
      throw new BadRequestException('Professor inválido para este curso/app.');
    }
  }

  private mapSummary(
    rx: PrescriptionEntity,
    itemsCount: number,
    courseName: string,
    patientName: string,
  ): PrescriptionSummaryResponse {
    const st = rx.student;
    const pf = rx.professor;
    return {
      id: rx.id,
      patientId: rx.patientId,
      patientName,
      courseId: rx.patient.courseId,
      courseName,
      appId: rx.appId,
      studentId: rx.studentId,
      studentName: st?.name ?? '—',
      professorId: rx.professorId,
      professorName: pf?.name ?? null,
      status: rx.status,
      justification: rx.justification,
      nextVisitDate: rx.nextVisitDate ? rx.nextVisitDate.toISOString() : null,
      createdAt: rx.createdAt.toISOString(),
      itemsCount,
      careEpisodeId: rx.careEpisodeId,
      careEpisodeTitle: rx.careEpisode?.title ?? null,
    };
  }

  private mapExerciseTaxonomy(ex: ExerciseEntity | undefined | null): PrescriptionExerciseTaxonomyRow[] {
    const links = ex?.exerciseCategories;
    if (!links?.length) return [];
    const seen = new Set<number>();
    const rows: PrescriptionExerciseTaxonomyRow[] = [];
    for (const ec of links) {
      const cat = ec.category;
      if (!cat || seen.has(cat.id)) continue;
      seen.add(cat.id);
      const def = cat.categoryTypeDefinition;
      const typeLabel = def?.label?.trim() || def?.key || '—';
      const typeKey = def?.key ?? '—';
      rows.push({
        clinicalCaseName: cat.clinicalCase?.name?.trim() ?? null,
        typeLabel,
        typeKey,
        categoryName: cat.name?.trim() || '—',
      });
    }
    rows.sort((a, b) => {
      const c = (a.clinicalCaseName ?? '').localeCompare(b.clinicalCaseName ?? '', 'pt-BR');
      if (c !== 0) return c;
      const t = a.typeLabel.localeCompare(b.typeLabel, 'pt-BR');
      if (t !== 0) return t;
      return a.categoryName.localeCompare(b.categoryName, 'pt-BR');
    });
    return rows;
  }

  private mapItemSteps(item: PrescriptionItemEntity): PrescriptionStepRow[] {
    const rows = [...(item.steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    if (rows.length) {
      return rows.map((step) => ({ order: step.sortOrder, text: step.description }));
    }
    return normalizeStepDescriptions(undefined, item.instructions);
  }

  private mapItems(items: PrescriptionItemEntity[]): PrescriptionItemResponse[] {
    return items.map((i) => {
      const steps = this.mapItemSteps(i);
      return {
        id: i.id,
        exerciseId: i.exerciseId,
        exerciseName: i.exercise?.name ?? '—',
        exerciseDescription: i.exercise?.description ?? null,
        exerciseCatalogInstructions: i.exercise?.instructions ?? null,
        instructions: i.instructions ?? stepsToInstructionsText(steps),
        steps,
        repetitions: i.repetitions,
        notes: i.notes,
        exerciseTaxonomy: this.mapExerciseTaxonomy(i.exercise),
      };
    });
  }

  private resolveItemSteps(it: PrescriptionItemInputDto): PrescriptionStepRow[] {
    const steps = normalizeStepDescriptions(it.steps, it.instructions);
    if (!steps.length) {
      throw new BadRequestException(
        'Informe ao menos uma etapa do passo a passo para cada exercício da prescrição.',
      );
    }
    return steps;
  }

  private async saveItemSteps(
    em: EntityManager,
    prescriptionItemId: number,
    steps: PrescriptionStepRow[],
  ) {
    const stepRepo = em.getRepository(PrescriptionItemStepEntity);
    await stepRepo.delete({ prescriptionItemId });
    if (!steps.length) return;
    await stepRepo.save(
      steps.map((step) =>
        stepRepo.create({
          prescriptionItemId,
          sortOrder: step.order,
          description: step.text,
        }),
      ),
    );
  }

  async list(
    actor: UserEntity,
    courseId: number,
    appId: number,
    status: PrescriptionStatus | undefined,
    opts: { page: number; limit: number; q?: string },
  ): Promise<PaginatedResult<PrescriptionSummaryResponse>> {
    await this.assertCourseAppMatch(courseId, appId);
    this.assertActorInCourse(actor, courseId, appId);

    const qb = this.prescriptions
      .createQueryBuilder('rx')
      .innerJoinAndSelect('rx.patient', 'pt')
      .innerJoinAndSelect('pt.user', 'pu')
      .innerJoinAndSelect('pt.course', 'pc')
      .innerJoinAndSelect('rx.student', 'st')
      .leftJoinAndSelect('rx.professor', 'pf')
      .leftJoinAndSelect('rx.careEpisode', 'ce')
      .where('pt.courseId = :courseId AND pt.appId = :appId AND rx.appId = :appId2', {
        courseId,
        appId,
        appId2: appId,
      });

    if (status) {
      qb.andWhere('rx.status = :st', { st: status });
    }

    if (actor.role === UserRole.STUDENT) {
      qb.andWhere('rx.studentId = :sid', { sid: actor.id });
    }

    const qt = opts.q?.trim();
    if (qt) {
      const like = `%${qt.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(pu.name) LIKE :like OR LOWER(pu.email) LIKE :like OR LOWER(st.name) LIKE :like)',
        { like },
      );
    }

    const total = await qb.getCount();
    const skip = (opts.page - 1) * opts.limit;
    const rows = await qb.orderBy('rx.createdAt', 'DESC').skip(skip).take(opts.limit).getMany();

    if (rows.length === 0) {
      return { data: [], total, page: opts.page, limit: opts.limit };
    }

    const ids = rows.map((r) => r.id);
    const countRows = await this.prescriptionItems
      .createQueryBuilder('pi')
      .select('pi.prescriptionId', 'pid')
      .addSelect('COUNT(*)', 'cnt')
      .where('pi.prescriptionId IN (:...ids)', { ids })
      .groupBy('pi.prescriptionId')
      .getRawMany<{ pid: number; cnt: string }>();
    const countMap = new Map<number, number>();
    for (const c of countRows) {
      countMap.set(Number(c.pid), Number(c.cnt));
    }

    const data = rows.map((rx) => {
      const pt = rx.patient;
      const courseName = pt.course?.name ?? '—';
      const patientName = pt.user?.name ?? '—';
      return this.mapSummary(rx, countMap.get(rx.id) ?? 0, courseName, patientName);
    });

    return { data, total, page: opts.page, limit: opts.limit };
  }

  async get(actor: UserEntity, id: number): Promise<PrescriptionDetailResponse> {
    const rx = await this.prescriptions.findOne({
      where: { id },
      relations: {
        patient: { user: true, course: true },
        student: true,
        professor: true,
        app: true,
        careEpisode: true,
        decidedBy: true,
        items: {
          steps: true,
          exercise: {
            exerciseCategories: {
              category: { categoryTypeDefinition: true, clinicalCase: true },
            },
          },
        },
      },
    });
    if (!rx) throw new NotFoundException('Prescrição não encontrada.');

    const pt = rx.patient;
    this.assertActorInCourse(actor, pt.courseId, pt.appId);
    if (actor.role === UserRole.STUDENT && rx.studentId !== actor.id) {
      throw new ForbiddenException('Sem permissão para ver esta prescrição.');
    }

    const courseName = pt.course?.name ?? '—';
    const patientName = pt.user?.name ?? '—';
    const items = [...(rx.items ?? [])].sort((a, b) => a.id - b.id);
    const base = this.mapSummary(rx, items.length, courseName, patientName);

    const coordRows = await this.users.find({
      where: { role: UserRole.COORDINATOR, courseId: pt.courseId, deletedAt: IsNull() },
      select: ['name'],
      order: { name: 'ASC' },
      take: 8,
    });

    return {
      ...base,
      items: this.mapItems(items),
      patientEmail: pt.user?.email ?? null,
      studentEmail: rx.student?.email ?? null,
      professorEmail: rx.professor?.email ?? null,
      appName: rx.app?.name ?? null,
      courseCoordinators: coordRows.map((c) => c.name).filter(Boolean),
      careEpisodeStatus: rx.careEpisode?.status ?? null,
      decidedAt: rx.decidedAt ? rx.decidedAt.toISOString() : null,
      decidedById: rx.decidedById,
      decidedByName: rx.decidedBy?.name ?? null,
    };
  }

  async create(
    actor: UserEntity,
    dto: CreatePrescriptionDto,
    ctx: RequestContext | null,
  ): Promise<PrescriptionDetailResponse> {
    await this.assertCourseAppMatch(dto.courseId, dto.appId);
    this.assertActorInCourse(actor, dto.courseId, dto.appId);

    const patient = await this.loadPatientScoped(dto.patientId, dto.courseId, dto.appId);

    let studentId = dto.studentId ?? patient.studentId;
    if (actor.role === UserRole.STUDENT) {
      studentId = actor.id;
      if (patient.studentId !== actor.id) {
        throw new ForbiddenException('Este paciente não está sob sua responsabilidade.');
      }
    }

    await this.validateStudentUser(studentId, dto.courseId, dto.appId);

    let professorId: number | null = dto.professorId ?? null;
    if (professorId == null && actor.role === UserRole.PROFESSOR) {
      professorId = actor.id;
    }
    if (professorId == null) {
      professorId = patient.professorId;
    }
    await this.validateProfessorUser(professorId, dto.courseId, dto.appId);

    const exIds = dto.items.map((i) => i.exerciseId);
    await this.validateExerciseIds(exIds, dto.courseId, dto.appId);

    const nextVisit =
      dto.nextVisitDate && dto.nextVisitDate.trim() ? new Date(dto.nextVisitDate) : null;
    const justification = dto.justification.trim();
    const careEpisodeId = await this.resolveCareEpisodeId(patient, dto.careEpisodeId);

    const newId = await this.dataSource.transaction(async (em) => {
      const rxRepo = em.getRepository(PrescriptionEntity);
      const piRepo = em.getRepository(PrescriptionItemEntity);

      const rx = rxRepo.create({
        patientId: patient.id,
        studentId,
        professorId,
        status: PrescriptionStatus.PENDING,
        justification,
        nextVisitDate: nextVisit,
        appId: dto.appId,
        careEpisodeId,
      });
      const saved = await rxRepo.save(rx);

      for (const it of dto.items) {
        const steps = this.resolveItemSteps(it);
        const savedItem = await piRepo.save(
          piRepo.create({
            prescriptionId: saved.id,
            exerciseId: it.exerciseId,
            instructions: stepsToInstructionsText(steps),
            repetitions: it.repetitions?.trim() || null,
            notes: it.notes?.trim() || null,
          }),
        );
        await this.saveItemSteps(em, savedItem.id, steps);
      }
      return saved.id;
    });

    await this.audit.log({
      userId: actor.id,
      action: 'PRESCRIPTION_CREATE',
      entity: 'Prescription',
      entityId: String(newId),
      metadata: { patientId: patient.id, items: dto.items.length },
      ctx,
    });

    const studentUser =
      studentId === actor.id ? actor : (await this.users.findOne({ where: { id: studentId } })) ?? null;
    const studentName = studentUser?.name ?? 'Estagiário';
    const patientName = patient.user?.name ?? 'Paciente';
    void this.notifications.notifyPrescriptionPending({
      courseId: dto.courseId,
      appId: dto.appId,
      studentId,
      prescriptionId: newId,
      patientName,
      studentName,
    });

    return this.get(actor, newId);
  }

  async update(
    actor: UserEntity,
    id: number,
    dto: UpdatePrescriptionDto,
    ctx: RequestContext | null,
  ): Promise<PrescriptionDetailResponse> {
    const rx = await this.prescriptions.findOne({
      where: { id },
      relations: { patient: { user: true, course: true }, student: true, professor: true },
    });
    if (!rx) throw new NotFoundException('Prescrição não encontrada.');

    const statusBefore = rx.status;

    const pt = rx.patient;
    this.assertActorInCourse(actor, pt.courseId, pt.appId);

    if (actor.role === UserRole.STUDENT && rx.studentId !== actor.id) {
      throw new ForbiddenException('Sem permissão para editar esta prescrição.');
    }

    if (dto.items !== undefined && dto.status !== undefined) {
      throw new BadRequestException('Altere o status ou a lista de exercícios em operações separadas.');
    }

    const wasPending = rx.status === PrescriptionStatus.PENDING;

    if (dto.status !== undefined && dto.status !== rx.status) {
      if (!this.canApprove(actor)) {
        throw new ForbiddenException('Apenas coordenação ou professor podem alterar o status.');
      }
      if (!wasPending) {
        throw new BadRequestException('Só é possível aprovar ou rejeitar prescrições pendentes.');
      }
      if (dto.status !== PrescriptionStatus.APPROVED && dto.status !== PrescriptionStatus.REJECTED) {
        throw new BadRequestException('Status inválido para aprovação.');
      }
      rx.status = dto.status;
      rx.decidedAt = new Date();
      rx.decidedById = actor.id;
    }

    const stillPending = rx.status === PrescriptionStatus.PENDING;

    if (dto.studentId !== undefined || dto.professorId !== undefined || dto.items !== undefined) {
      if (!stillPending) {
        throw new BadRequestException(
          'Só é possível alterar itens ou responsáveis enquanto a prescrição estiver pendente.',
        );
      }
    }

    if (dto.nextVisitDate !== undefined && !stillPending) {
      throw new BadRequestException('Não é possível alterar a data com prescrição já aprovada ou rejeitada.');
    }

    if (dto.studentId !== undefined) {
      if (actor.role === UserRole.STUDENT) {
        throw new ForbiddenException('Não é permitido alterar o estagiário.');
      }
      await this.validateStudentUser(dto.studentId, pt.courseId, pt.appId);
      rx.studentId = dto.studentId;
    }

    if (dto.professorId !== undefined) {
      if (actor.role === UserRole.STUDENT) {
        throw new ForbiddenException('Não é permitido alterar o professor.');
      }
      if (dto.professorId == null) {
        rx.professorId = null;
      } else {
        await this.validateProfessorUser(dto.professorId, pt.courseId, pt.appId);
        rx.professorId = dto.professorId;
      }
    }

    if (dto.careEpisodeId !== undefined) {
      if (!stillPending) {
        throw new BadRequestException(
          'Só é possível alterar o episódio de cuidado enquanto a prescrição estiver pendente.',
        );
      }
      rx.careEpisodeId = await this.resolveCareEpisodeId(pt, dto.careEpisodeId);
    }

    if (dto.justification !== undefined) {
      const allowJustification =
        wasPending || (dto.status === PrescriptionStatus.REJECTED && this.canApprove(actor));
      if (!allowJustification) {
        throw new BadRequestException('Justificativa só em prescrição pendente ou ao rejeitar.');
      }
      const jt = dto.justification?.trim() ?? '';
      if (stillPending && jt.length < 2) {
        throw new BadRequestException(
          'Informe a justificativa ou observação (mínimo 2 caracteres) enquanto a prescrição estiver pendente.',
        );
      }
      rx.justification = jt.length ? jt : null;
    }

    if (dto.nextVisitDate !== undefined) {
      rx.nextVisitDate =
        dto.nextVisitDate && dto.nextVisitDate.trim() ? new Date(dto.nextVisitDate) : null;
    }

    if (dto.items !== undefined) {
      if (actor.role === UserRole.STUDENT) {
        // estagiário edita a própria prescrição
      } else if (!this.canApprove(actor)) {
        throw new ForbiddenException('Sem permissão para alterar os exercícios.');
      }
      const exIds = dto.items.map((i) => i.exerciseId);
      await this.validateExerciseIds(exIds, pt.courseId, pt.appId);

      await this.dataSource.transaction(async (em) => {
        const piRepo = em.getRepository(PrescriptionItemEntity);
        const rxRepo = em.getRepository(PrescriptionEntity);
        await piRepo.delete({ prescriptionId: id });
        for (const it of dto.items!) {
          const steps = this.resolveItemSteps(it);
          const savedItem = await piRepo.save(
            piRepo.create({
              prescriptionId: id,
              exerciseId: it.exerciseId,
              instructions: stepsToInstructionsText(steps),
              repetitions: it.repetitions?.trim() || null,
              notes: it.notes?.trim() || null,
            }),
          );
          await this.saveItemSteps(em, savedItem.id, steps);
        }
        await rxRepo.save(rx);
      });
    } else {
      await this.prescriptions.save(rx);
    }

    const statusAfter = rx.status;
    const changedKeys = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
    await this.audit.log({
      userId: actor.id,
      action: 'PRESCRIPTION_UPDATE',
      entity: 'Prescription',
      entityId: String(id),
      metadata: {
        changed: changedKeys,
        ...(statusAfter !== statusBefore
          ? { prescriptionStatus: { from: statusBefore, to: statusAfter } }
          : {}),
      },
      ctx,
    });

    if (
      statusAfter !== statusBefore &&
      (statusAfter === PrescriptionStatus.APPROVED || statusAfter === PrescriptionStatus.REJECTED)
    ) {
      const patientName = pt.user?.name ?? 'Paciente';
      void this.notifications.notifyPrescriptionDecision({
        studentId: rx.studentId,
        prescriptionId: id,
        status: statusAfter,
        patientName,
        decidedByName: actor.name,
      });
    }

    return this.get(actor, id);
  }

  async remove(actor: UserEntity, id: number, ctx: RequestContext | null): Promise<{ ok: true }> {
    const rx = await this.prescriptions.findOne({
      where: { id },
      relations: { patient: { user: true } },
    });
    if (!rx) throw new NotFoundException('Prescrição não encontrada.');

    const pt = rx.patient;
    this.assertActorInCourse(actor, pt.courseId, pt.appId);

    if (rx.status !== PrescriptionStatus.PENDING) {
      throw new BadRequestException('Só é possível excluir prescrições pendentes.');
    }

    if (actor.role === UserRole.STUDENT) {
      if (rx.studentId !== actor.id) {
        throw new ForbiddenException('Sem permissão para excluir esta prescrição.');
      }
    }

    const studentId = rx.studentId;
    const patientName = pt.user?.name ?? 'Paciente';

    await this.prescriptions.delete({ id });

    await this.audit.log({
      userId: actor.id,
      action: 'PRESCRIPTION_DELETE',
      entity: 'Prescription',
      entityId: String(id),
      ctx,
    });

    if (actor.id !== studentId) {
      void this.notifications.notifyPrescriptionRemoved({
        studentId,
        prescriptionId: id,
        patientName,
        removedByName: actor.name,
      });
    }

    return { ok: true };
  }
}
