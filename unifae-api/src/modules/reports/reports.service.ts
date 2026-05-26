import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parsePageLimit, toPaginated, type PaginatedResult } from '../../common/pagination';
import { AppEntity } from '../../database/entities/app.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { ClinicalCaseEntity } from '../../database/entities/clinical-case.entity';
import { CourseMenuNodeEntity } from '../../database/entities/course-menu-node.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { ExerciseAttachmentEntity } from '../../database/entities/exercise-attachment.entity';
import { ExerciseCategoryEntity } from '../../database/entities/exercise-category.entity';
import { ExerciseEntity } from '../../database/entities/exercise.entity';
import { MenuNodeEntity } from '../../database/entities/menu-node.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PrescriptionItemEntity } from '../../database/entities/prescription-item.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { PrescriptionStatus, UserRole } from '../../database/entities/enums';
import { applyActorScope, coordinatorAppFilter } from './reports-scope';

const REPORT_MAX = 200;

type ReportKind =
  | 'apps'
  | 'courses'
  | 'users'
  | 'patients'
  | 'patientTimeline'
  | 'prescriptions'
  | 'categories'
  | 'exercises'
  | 'exerciseCategories'
  | 'menuNodes'
  | 'courseMenus'
  | 'clinicalCases';

export type ReportListParams = {
  page?: string;
  limit?: string;
  q?: string;
  appId?: string;
  courseId?: string;
  status?: string;
  role?: string;
  active?: string;
  createdFrom?: string;
  createdTo?: string;
  clinicalCaseId?: string;
  includeDeleted?: string;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AppEntity)
    private readonly appRepo: Repository<AppEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepo: Repository<CourseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientRepo: Repository<PatientEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptionRepo: Repository<PrescriptionEntity>,
    @InjectRepository(PrescriptionItemEntity)
    private readonly prescriptionItemRepo: Repository<PrescriptionItemEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(ExerciseEntity)
    private readonly exerciseRepo: Repository<ExerciseEntity>,
    @InjectRepository(ExerciseCategoryEntity)
    private readonly exerciseCategoryRepo: Repository<ExerciseCategoryEntity>,
    @InjectRepository(MenuNodeEntity)
    private readonly menuNodeRepo: Repository<MenuNodeEntity>,
    @InjectRepository(CourseMenuNodeEntity)
    private readonly courseMenuNodeRepo: Repository<CourseMenuNodeEntity>,
    @InjectRepository(ClinicalCaseEntity)
    private readonly clinicalCaseRepo: Repository<ClinicalCaseEntity>,
    @InjectRepository(ExerciseAttachmentEntity)
    private readonly exerciseAttachmentRepo: Repository<ExerciseAttachmentEntity>,
  ) {}

  private paginate(params: ReportListParams) {
    return parsePageLimit(params.page, params.limit, 50, REPORT_MAX);
  }

  /** ADMIN: tudo. COORD/PROF: tudo exceto catálogo global de menus. STUDENT: só pacientes e prescrições (próprios). */
  /** Valida acesso à linha do tempo (mesmas regras de escopo que `patients` na API). */
  ensurePatientTimelineAccess(actor: UserEntity): void {
    this.ensureReportAccess(actor, 'patientTimeline');
  }

  private ensureReportAccess(actor: UserEntity, kind: ReportKind): void {
    if (actor.role === UserRole.ADMIN) return;

    if (actor.role === UserRole.STUDENT) {
      if (kind === 'patients' || kind === 'prescriptions' || kind === 'patientTimeline') return;
      throw new ForbiddenException('Este relatório não está disponível para estagiários.');
    }

    if (actor.role === UserRole.COORDINATOR || actor.role === UserRole.PROFESSOR) {
      if (kind === 'menuNodes') {
        throw new ForbiddenException('Catálogo global de menus: apenas administradores.');
      }
      return;
    }

    throw new ForbiddenException('Sem permissão para relatórios.');
  }

  async apps(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'apps');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.appRepo.createQueryBuilder('a');
    coordinatorAppFilter(actor, qb, 'a');
    if (params.active === 'true' || params.active === '1') qb.andWhere('a.active = true');
    else if (params.active === 'false' || params.active === '0') qb.andWhere('a.active = false');
    const q = params.q?.trim();
    if (q) qb.andWhere('LOWER(a.name) LIKE :q', { q: `%${q.toLowerCase()}%` });

    const total = await qb.getCount();
    const rows = await qb.orderBy('a.id', 'ASC').skip(skip).take(limit).getMany();

    const data = rows.map((a) => ({
      id: a.id,
      name: a.name,
      active: a.active,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
    return toPaginated(data, total, page, limit);
  }

  async courses(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'courses');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.courseRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.app', 'app');
    applyActorScope(actor, qb, { courseId: 'c.id', appId: 'c.appId' });
    if (params.appId) qb.andWhere('c.appId = :appId', { appId: Number(params.appId) });
    if (params.active === 'true' || params.active === '1') qb.andWhere('c.active = true');
    else if (params.active === 'false' || params.active === '0') qb.andWhere('c.active = false');
    const q = params.q?.trim();
    if (q) qb.andWhere('LOWER(c.name) LIKE :q', { q: `%${q.toLowerCase()}%` });

    const total = await qb.getCount();
    const rows = await qb.orderBy('c.id', 'ASC').skip(skip).take(limit).getMany();

    const data = rows.map((c) => ({
      id: c.id,
      name: c.name,
      caseContextLabel: c.caseContextLabel,
      active: c.active,
      appId: c.appId,
      appName: c.app?.name ?? null,
      hasNavigationJson: c.navigationJson != null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
    return toPaginated(data, total, page, limit);
  }

  async users(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'users');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.app', 'app')
      .leftJoinAndSelect('u.course', 'course');

    const includeDeleted =
      actor.role === UserRole.ADMIN && (params.includeDeleted === 'true' || params.includeDeleted === '1');
    if (!includeDeleted) qb.andWhere('u.deletedAt IS NULL');

    if (actor.role !== UserRole.ADMIN) {
      if (actor.courseId != null) qb.andWhere('u.courseId = :sc', { sc: actor.courseId });
      if (actor.appId != null) qb.andWhere('u.appId = :sa', { sa: actor.appId });
    }

    if (params.appId) qb.andWhere('u.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('u.courseId = :courseId', { courseId: Number(params.courseId) });
    if (params.role) qb.andWhere('u.role = :role', { role: params.role });
    if (params.active === 'true' || params.active === '1') qb.andWhere('u.active = true');
    else if (params.active === 'false' || params.active === '0') qb.andWhere('u.active = false');
    const q = params.q?.trim();
    if (q) qb.andWhere('(LOWER(u.name) LIKE :q OR LOWER(u.email) LIKE :q)', { q: `%${q.toLowerCase()}%` });

    const total = await qb.getCount();
    const rows = await qb.orderBy('u.id', 'DESC').skip(skip).take(limit).getMany();

    const data = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      activeFrom: u.activeFrom,
      activeUntil: u.activeUntil,
      courseId: u.courseId,
      courseName: u.course?.name ?? null,
      appId: u.appId,
      appName: u.app?.name ?? null,
      firstLoginAt: u.firstLoginAt ? u.firstLoginAt.toISOString() : null,
      firstLoginIp: u.firstLoginIp,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
    return toPaginated(data, total, page, limit);
  }

  async patients(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'patients');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.patientRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.user', 'pu')
      .innerJoinAndSelect('p.student', 'st')
      .leftJoinAndSelect('p.professor', 'pf')
      .innerJoinAndSelect('p.course', 'pc')
      .innerJoinAndSelect('p.app', 'pa');
    applyActorScope(actor, qb, { courseId: 'p.courseId', appId: 'p.appId' });
    if (actor.role === UserRole.STUDENT) {
      qb.andWhere('p.studentId = :_ownStudent', { _ownStudent: actor.id });
    }
    if (params.appId) qb.andWhere('p.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('p.courseId = :courseId', { courseId: Number(params.courseId) });
    const q = params.q?.trim();
    if (q) {
      qb.andWhere(
        '(LOWER(pu.name) LIKE :q OR LOWER(pu.email) LIKE :q OR LOWER(st.name) LIKE :q OR LOWER(st.email) LIKE :q)',
        { q: `%${q.toLowerCase()}%` },
      );
    }

    const total = await qb.getCount();
    const rows = await qb.orderBy('p.id', 'DESC').skip(skip).take(limit).getMany();

    const data = rows.map((p) => ({
      id: p.id,
      patientUserId: p.userId,
      patientName: p.user.name,
      patientEmail: p.user.email,
      studentId: p.studentId,
      studentName: p.student.name,
      studentEmail: p.student.email,
      professorId: p.professorId,
      professorName: p.professor?.name ?? null,
      professorEmail: p.professor?.email ?? null,
      courseId: p.courseId,
      courseName: p.course.name,
      appId: p.appId,
      appName: p.app.name,
    }));
    return toPaginated(data, total, page, limit);
  }

  async prescriptions(
    actor: UserEntity,
    params: ReportListParams,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'prescriptions');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.prescriptionRepo
      .createQueryBuilder('rx')
      .innerJoinAndSelect('rx.patient', 'pt')
      .innerJoinAndSelect('pt.user', 'pu')
      .innerJoinAndSelect('pt.course', 'pc')
      .innerJoinAndSelect('rx.app', 'ap')
      .innerJoinAndSelect('rx.student', 'st')
      .leftJoinAndSelect('rx.professor', 'pf')
      .leftJoinAndSelect('rx.careEpisode', 'ce');

    applyActorScope(actor, qb, { courseId: 'pt.courseId', appId: 'rx.appId' });
    if (actor.role === UserRole.STUDENT) {
      qb.andWhere('rx.studentId = :_ownStudent', { _ownStudent: actor.id });
    }
    if (params.appId) qb.andWhere('rx.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('pt.courseId = :courseId', { courseId: Number(params.courseId) });

    const statusFilter = params.status?.trim().toUpperCase();
    if (statusFilter === 'PENDING' || statusFilter === 'APPROVED' || statusFilter === 'REJECTED') {
      qb.andWhere('rx.status = :st', { st: statusFilter as PrescriptionStatus });
    }

    if (params.createdFrom) {
      qb.andWhere('rx.createdAt >= :cf', { cf: new Date(params.createdFrom) });
    }
    if (params.createdTo) {
      const t = new Date(params.createdTo);
      t.setHours(23, 59, 59, 999);
      qb.andWhere('rx.createdAt <= :ct', { ct: t });
    }

    const q = params.q?.trim();
    if (q) {
      if (/^\d+$/.test(q)) {
        qb.andWhere(
          '(LOWER(pu.name) LIKE :like OR LOWER(pu.email) LIKE :like OR LOWER(st.name) LIKE :like OR rx.id = :rid)',
          { like: `%${q.toLowerCase()}%`, rid: Number(q) },
        );
      } else {
        qb.andWhere(
          '(LOWER(pu.name) LIKE :like OR LOWER(pu.email) LIKE :like OR LOWER(st.name) LIKE :like)',
          { like: `%${q.toLowerCase()}%` },
        );
      }
    }

    const total = await qb.getCount();
    const rows = await qb.orderBy('rx.createdAt', 'DESC').skip(skip).take(limit).getMany();

    const ids = rows.map((r) => r.id);
    let countMap = new Map<number, number>();
    if (ids.length) {
      const raw = await this.prescriptionItemRepo
        .createQueryBuilder('pi')
        .select('pi.prescriptionId', 'pid')
        .addSelect('COUNT(*)', 'cnt')
        .where('pi.prescriptionId IN (:...ids)', { ids })
        .groupBy('pi.prescriptionId')
        .getRawMany<{ pid: number; cnt: string }>();
      countMap = new Map(raw.map((r) => [Number(r.pid), Number(r.cnt)]));
    }

    const data = rows.map((rx) => ({
      id: rx.id,
      status: rx.status,
      justification: rx.justification,
      nextVisitDate: rx.nextVisitDate ? rx.nextVisitDate.toISOString() : null,
      createdAt: rx.createdAt.toISOString(),
      appId: rx.appId,
      appName: rx.app.name,
      patientId: rx.patientId,
      patientName: rx.patient.user.name,
      patientEmail: rx.patient.user.email,
      courseId: rx.patient.courseId,
      courseName: rx.patient.course.name,
      studentId: rx.studentId,
      studentName: rx.student.name,
      studentEmail: rx.student.email,
      professorId: rx.professorId,
      professorName: rx.professor?.name ?? null,
      professorEmail: rx.professor?.email ?? null,
      itemsCount: countMap.get(rx.id) ?? 0,
      careEpisodeId: rx.careEpisodeId,
      careEpisodeTitle: rx.careEpisode?.title ?? null,
    }));
    return toPaginated(data, total, page, limit);
  }

  async categories(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'categories');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.categoryRepo
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.categoryTypeDefinition', 'ctd')
      .leftJoinAndSelect('cat.clinicalCase', 'cc')
      .leftJoinAndSelect('cat.parent', 'par')
      .innerJoinAndSelect('cat.course', 'crs')
      .innerJoinAndSelect('cat.app', 'ap');
    applyActorScope(actor, qb, { courseId: 'cat.courseId', appId: 'cat.appId' });
    if (params.appId) qb.andWhere('cat.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('cat.courseId = :courseId', { courseId: Number(params.courseId) });
    if (params.clinicalCaseId) qb.andWhere('cat.clinicalCaseId = :ccid', { ccid: Number(params.clinicalCaseId) });
    const q = params.q?.trim();
    if (q) qb.andWhere('LOWER(cat.name) LIKE :q', { q: `%${q.toLowerCase()}%` });

    const total = await qb.getCount();
    const rows = await qb.orderBy('cat.courseId', 'ASC').addOrderBy('cat.sortOrder', 'ASC').skip(skip).take(limit).getMany();

    const data = rows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      isLeafLevel: cat.isLeafLevel,
      parentId: cat.parentId,
      parentName: cat.parent?.name ?? null,
      categoryTypeKey: cat.categoryTypeDefinition?.key ?? null,
      categoryTypeLabel: cat.categoryTypeDefinition?.label ?? null,
      clinicalCaseId: cat.clinicalCaseId,
      clinicalCaseName: cat.clinicalCase?.name ?? null,
      courseId: cat.courseId,
      courseName: cat.course.name,
      appId: cat.appId,
      appName: cat.app.name,
    }));
    return toPaginated(data, total, page, limit);
  }

  async exercises(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'exercises');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.exerciseRepo
      .createQueryBuilder('ex')
      .innerJoinAndSelect('ex.course', 'crs')
      .innerJoinAndSelect('ex.app', 'ap')
      .innerJoinAndSelect('ex.createdBy', 'cb');
    applyActorScope(actor, qb, { courseId: 'ex.courseId', appId: 'ex.appId' });
    if (params.appId) qb.andWhere('ex.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('ex.courseId = :courseId', { courseId: Number(params.courseId) });
    if (params.active === 'true' || params.active === '1') qb.andWhere('ex.active = true');
    else if (params.active === 'false' || params.active === '0') qb.andWhere('ex.active = false');
    const q = params.q?.trim();
    if (q) qb.andWhere('LOWER(ex.name) LIKE :q', { q: `%${q.toLowerCase()}%` });

    const total = await qb.getCount();
    const rows = await qb.orderBy('ex.id', 'DESC').skip(skip).take(limit).getMany();

    const ids = rows.map((e) => e.id);
    let attMap = new Map<number, number>();
    let catMap = new Map<number, number>();
    if (ids.length) {
      const ra = await this.exerciseAttachmentRepo
        .createQueryBuilder('a')
        .select('a.exerciseId', 'eid')
        .addSelect('COUNT(*)', 'cnt')
        .where('a.exerciseId IN (:...ids)', { ids })
        .groupBy('a.exerciseId')
        .getRawMany<{ eid: number; cnt: string }>();
      attMap = new Map(ra.map((r) => [Number(r.eid), Number(r.cnt)]));
      const rc = await this.exerciseCategoryRepo
        .createQueryBuilder('ec')
        .select('ec.exerciseId', 'eid')
        .addSelect('COUNT(*)', 'cnt')
        .where('ec.exerciseId IN (:...ids)', { ids })
        .groupBy('ec.exerciseId')
        .getRawMany<{ eid: number; cnt: string }>();
      catMap = new Map(rc.map((r) => [Number(r.eid), Number(r.cnt)]));
    }

    const data = rows.map((ex) => ({
      id: ex.id,
      name: ex.name,
      description: ex.description,
      instructions: ex.instructions,
      videoUrl: ex.videoUrl,
      active: ex.active,
      courseId: ex.courseId,
      courseName: ex.course.name,
      appId: ex.appId,
      appName: ex.app.name,
      createdById: ex.createdById,
      createdByName: ex.createdBy.name,
      createdAt: ex.createdAt.toISOString(),
      updatedAt: ex.updatedAt.toISOString(),
      attachmentsCount: attMap.get(ex.id) ?? 0,
      categoriesLinksCount: catMap.get(ex.id) ?? 0,
    }));
    return toPaginated(data, total, page, limit);
  }

  async exerciseCategories(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'exerciseCategories');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.exerciseCategoryRepo
      .createQueryBuilder('ec')
      .innerJoinAndSelect('ec.exercise', 'ex')
      .innerJoinAndSelect('ec.category', 'cat')
      .innerJoinAndSelect('ex.course', 'crs')
      .innerJoinAndSelect('ex.app', 'ap');
    applyActorScope(actor, qb, { courseId: 'ex.courseId', appId: 'ex.appId' });
    if (params.appId) qb.andWhere('ex.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('ex.courseId = :courseId', { courseId: Number(params.courseId) });
    const q = params.q?.trim();
    if (q) {
      qb.andWhere(
        '(LOWER(ex.name) LIKE :q OR LOWER(cat.name) LIKE :q)',
        { q: `%${q.toLowerCase()}%` },
      );
    }

    const total = await qb.getCount();
    const rows = await qb.orderBy('ec.id', 'DESC').skip(skip).take(limit).getMany();

    const data = rows.map((ec) => ({
      linkId: ec.id,
      exerciseId: ec.exerciseId,
      exerciseName: ec.exercise.name,
      categoryId: ec.categoryId,
      categoryName: ec.category.name,
      courseId: ec.exercise.courseId,
      courseName: ec.exercise.course.name,
      appId: ec.exercise.appId,
      appName: ec.exercise.app.name,
    }));
    return toPaginated(data, total, page, limit);
  }

  async menuNodes(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'menuNodes');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.menuNodeRepo.createQueryBuilder('n').leftJoinAndSelect('n.parent', 'p');
    const q = params.q?.trim();
    if (q) {
      qb.andWhere(
        '(LOWER(n.key) LIKE :q OR LOWER(n.label) LIKE :q)',
        { q: `%${q.toLowerCase()}%` },
      );
    }
    const total = await qb.getCount();
    const rows = await qb.orderBy('n.parentId', 'ASC').addOrderBy('n.id', 'ASC').skip(skip).take(limit).getMany();

    const data = rows.map((n) => ({
      id: n.id,
      key: n.key,
      label: n.label,
      icon: n.icon,
      routeName: n.routeName,
      parentId: n.parentId,
      parentKey: n.parent?.key ?? null,
      parentLabel: n.parent?.label ?? null,
      includeInNewCourses: n.includeInNewCourses,
    }));
    return toPaginated(data, total, page, limit);
  }

  async courseMenus(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'courseMenus');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.courseMenuNodeRepo
      .createQueryBuilder('cm')
      .innerJoinAndSelect('cm.course', 'crs')
      .leftJoinAndSelect('crs.app', 'ap')
      .innerJoinAndSelect('cm.menuNode', 'mn');
    applyActorScope(actor, qb, { courseId: 'cm.courseId', appId: 'crs.appId' });
    if (params.appId) qb.andWhere('crs.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('cm.courseId = :courseId', { courseId: Number(params.courseId) });
    const q = params.q?.trim();
    if (q) {
      qb.andWhere(
        '(LOWER(crs.name) LIKE :q OR LOWER(mn.label) LIKE :q OR LOWER(mn.key) LIKE :q)',
        { q: `%${q.toLowerCase()}%` },
      );
    }

    const total = await qb.getCount();
    const rows = await qb.orderBy('cm.courseId', 'ASC').addOrderBy('cm.sortOrder', 'ASC').skip(skip).take(limit).getMany();

    const data = rows.map((cm) => ({
      id: cm.id,
      courseId: cm.courseId,
      courseName: cm.course.name,
      appId: cm.course.appId,
      appName: cm.course.app?.name ?? null,
      menuNodeId: cm.menuNodeId,
      menuKey: cm.menuNode.key,
      menuLabel: cm.menuNode.label,
      menuIcon: cm.menuNode.icon,
      menuRouteName: cm.menuNode.routeName,
      enabled: cm.enabled,
      sortOrder: cm.sortOrder,
    }));
    return toPaginated(data, total, page, limit);
  }

  async clinicalCases(actor: UserEntity, params: ReportListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    this.ensureReportAccess(actor, 'clinicalCases');
    const { page, limit, skip } = this.paginate(params);
    const qb = this.clinicalCaseRepo
      .createQueryBuilder('cc')
      .innerJoinAndSelect('cc.course', 'crs')
      .innerJoinAndSelect('cc.app', 'ap');
    applyActorScope(actor, qb, { courseId: 'cc.courseId', appId: 'cc.appId' });
    if (params.appId) qb.andWhere('cc.appId = :appId', { appId: Number(params.appId) });
    if (params.courseId) qb.andWhere('cc.courseId = :courseId', { courseId: Number(params.courseId) });
    const q = params.q?.trim();
    if (q) qb.andWhere('LOWER(cc.name) LIKE :q', { q: `%${q.toLowerCase()}%` });

    const total = await qb.getCount();
    const rows = await qb.orderBy('cc.courseId', 'ASC').addOrderBy('cc.id', 'ASC').skip(skip).take(limit).getMany();

    const data = rows.map((cc) => ({
      id: cc.id,
      name: cc.name,
      description: cc.description,
      courseId: cc.courseId,
      courseName: cc.course.name,
      appId: cc.appId,
      appName: cc.app.name,
    }));
    return toPaginated(data, total, page, limit);
  }
}
