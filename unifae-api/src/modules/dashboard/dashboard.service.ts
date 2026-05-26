import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AppEntity,
  CategoryEntity,
  CourseEntity,
  PatientEntity,
  PatientExecutionEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  UserEntity as DbUserEntity,
} from '../../database/entities';
import { ExecutionStatus, PrescriptionStatus, UserRole } from '../../database/entities/enums';
import type { UserEntity } from '../../database/entities/user.entity';

export type DashboardOverview = {
  viewer: {
    role: UserRole;
    appId: number | null;
    courseId: number | null;
  };
  filters: {
    appId: number | null;
    courseId: number | null;
    periodDays: number;
    since: string; // ISO
    until: string; // ISO
  };
  cards: {
    apps: number;
    courses: number;
    pendingPrescriptions: number;
    adherenceRate: number | null; // 0..1
    users?: number;
    patients?: number;
    students?: number;
    myPatients?: number;
    /** Somente painel admin global */
    categories?: number;
    /** Itens com pai na árvore (subcategorias) */
    subcategories?: number;
    /** Relatórios (módulo ainda não persistido; placeholder) */
    reportsCreated?: number;
    reportsPublished?: number;
    activePatients?: number;
    highRiskPatients?: number;
  };
  lists: {
    courses: Array<{
      id: number;
      name: string;
      appId: number | null;
      active: boolean;
      patients: number;
      pendingPrescriptions: number;
      adherenceRate: number | null;
    }>;
    apps: Array<{ id: number; name: string; active: boolean }>;
  };
};

export type DashboardTimeseriesPoint = {
  date: string; // YYYY-MM-DD
  pendingPrescriptions: number;
  adherenceRate: number | null; // 0..1
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(AppEntity)
    private readonly appsRepo: Repository<AppEntity>,
    @InjectRepository(CourseEntity)
    private readonly coursesRepo: Repository<CourseEntity>,
    @InjectRepository(DbUserEntity)
    private readonly usersRepo: Repository<DbUserEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepo: Repository<PatientEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptionsRepo: Repository<PrescriptionEntity>,
    @InjectRepository(PrescriptionItemEntity)
    private readonly prescriptionItemsRepo: Repository<PrescriptionItemEntity>,
    @InjectRepository(PatientExecutionEntity)
    private readonly executionsRepo: Repository<PatientExecutionEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepo: Repository<CategoryEntity>,
  ) {}

  private parseYmdToLocalStart(ymd: string) {
    const [y, m, d] = ymd.split('-').map((x) => Number(x));
    // Data local (evita offsets UTC) para bater com DATE() do MySQL.
    return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  }

  private getRangeFromParams(params: {
    periodDays?: number;
    date?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const now = new Date();

    // Dia único: [date 00:00, date+1 00:00)
    if (params.date) {
      const since = this.parseYmdToLocalStart(params.date);
      const until = new Date(since);
      until.setDate(until.getDate() + 1);
      return { since, until, periodDays: 1 };
    }

    // Intervalo: [start 00:00, end+1 00:00)
    if (params.startDate && params.endDate) {
      const since = this.parseYmdToLocalStart(params.startDate);
      const until = this.parseYmdToLocalStart(params.endDate);
      until.setDate(until.getDate() + 1);
      const days = Math.max(1, Math.ceil((until.getTime() - since.getTime()) / 86400000));
      return { since, until, periodDays: days };
    }

    // Período padrão (últimos N dias)
    const periodDays = params.periodDays ?? 30;
    const until = now;
    const since = new Date(until);
    since.setDate(until.getDate() - periodDays);
    return { since, until, periodDays };
  }

  private applyScope(
    user: UserEntity,
    params: { appId?: number; courseId?: number; periodDays?: number },
  ) {
    // ADMIN: respeita query (global ou por app/curso)
    if (user.role === UserRole.ADMIN) return params;

    // COORDINATOR: restringe ao curso do usuário (e ao app se existir)
    if (user.role === UserRole.COORDINATOR) {
      return {
        ...params,
        appId: user.appId ?? params.appId,
        courseId: user.courseId ?? params.courseId,
      };
    }

    // STUDENT: restringe ao app/curso do usuário; dados sempre filtrados por studentId nas queries abaixo
    if (user.role === UserRole.STUDENT) {
      return {
        ...params,
        appId: user.appId ?? params.appId,
        courseId: user.courseId ?? params.courseId,
      };
    }

    // Outros papéis: por segurança, no mínimo restringe ao app do usuário (se houver).
    return {
      ...params,
      appId: user.appId ?? params.appId,
      courseId: user.courseId ?? params.courseId,
    };
  }

  async timeseries(
    user: UserEntity,
    params: { appId?: number; courseId?: number; periodDays?: number; date?: string; startDate?: string; endDate?: string },
  ) {
    const scoped = this.applyScope(user, params);
    const { since, until, periodDays } = this.getRangeFromParams(scoped);
    const appId = scoped.appId;
    const courseId = scoped.courseId;
    const studentId = user.role === UserRole.STUDENT ? user.id : null;

    // Pendências "no dia" (backlog) a partir de prescrições com status PENDING.
    // Estratégia: conta pendências criadas antes de `since` (baseline) e soma o que entrou no range.
    const pendingQb = this.prescriptionsRepo
      .createQueryBuilder('p')
      .select('DATE(p.createdAt)', 'd')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.status = :st', { st: PrescriptionStatus.PENDING })
      .andWhere('p.createdAt >= :since AND p.createdAt < :until', { since, until })
      .groupBy('d')
      .orderBy('d', 'ASC');

    if (courseId || studentId) {
      pendingQb.innerJoin(PatientEntity, 'pt', 'pt.id = p.patientId');
      if (courseId) pendingQb.andWhere('pt.courseId = :courseId', { courseId });
      if (studentId) pendingQb.andWhere('pt.studentId = :studentId', { studentId });
    }
    if (appId) pendingQb.andWhere('p.appId = :appId', { appId });
    const pendingRaw = await pendingQb.getRawMany<{ d: string; cnt: string }>();

    const baselineQb = this.prescriptionsRepo
      .createQueryBuilder('p')
      .where('p.status = :st', { st: PrescriptionStatus.PENDING })
      .andWhere('p.createdAt < :since', { since });

    if (courseId || studentId) {
      baselineQb.innerJoin(PatientEntity, 'pt', 'pt.id = p.patientId');
      if (courseId) baselineQb.andWhere('pt.courseId = :courseId', { courseId });
      if (studentId) baselineQb.andWhere('pt.studentId = :studentId', { studentId });
    }
    if (appId) baselineQb.andWhere('p.appId = :appId', { appId });
    const pendingBaseline = await baselineQb.getCount();

    // Executions per day with completed count (for adherence).
    const execQb = this.executionsRepo
      .createQueryBuilder('e')
      .select('DATE(e.performedAt)', 'd')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN e.status = :completed THEN 1 ELSE 0 END)`, 'completed')
      .where('e.performedAt >= :since AND e.performedAt < :until', { since, until })
      .setParameter('completed', ExecutionStatus.COMPLETED)
      .groupBy('d')
      .orderBy('d', 'ASC');

    if (appId || courseId || studentId) {
      execQb.innerJoin(PatientEntity, 'pt', 'pt.id = e.patientId');
      if (appId) execQb.andWhere('pt.appId = :appId', { appId });
      if (courseId) execQb.andWhere('pt.courseId = :courseId', { courseId });
      if (studentId) execQb.andWhere('pt.studentId = :studentId', { studentId });
    }
    const execRaw = await execQb.getRawMany<{ d: string; total: string; completed: string }>();

    const dayKey = (v: any) => {
      if (!v) return '';
      // Se for objeto Date, converte para YYYY-MM-DD
      const date = typeof v === 'string' ? new Date(v) : v;
      if (isNaN(date.getTime())) return String(v).slice(0, 10);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const pendingCreatedByDay = new Map<string, number>();
    for (const r of pendingRaw) pendingCreatedByDay.set(dayKey(r.d), Number(r.cnt));
    const execByDay = new Map<string, { total: number; completed: number }>();
    for (const r of execRaw)
      execByDay.set(dayKey(r.d), { total: Number(r.total), completed: Number(r.completed) });

    // Fill all days in range.
    const points: DashboardTimeseriesPoint[] = [];
    const cur = new Date(since);
    const dateKeyLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    while (cur < until) {
      const d = dateKeyLocal(cur);
      const pend = pendingCreatedByDay.get(d) ?? 0;
      const ex = execByDay.get(d);
      const rate = ex && ex.total > 0 ? Math.max(0, Math.min(1, ex.completed / ex.total)) : null;
      points.push({ date: d, pendingPrescriptions: pend, adherenceRate: rate });
      cur.setDate(cur.getDate() + 1);
    }
    return {
      filters: {
        appId: appId ?? null,
        courseId: courseId ?? null,
        periodDays,
        since: since.toISOString(),
        until: until.toISOString(),
      },
      points,
    };
  }

  /** Conta abas de relatórios disponíveis conforme ReportsView.vue */
  private getReportsCount(role: UserRole): number {
    if (role === UserRole.ADMIN) return 12;
    if (role === UserRole.STUDENT) return 3; // patients, prescriptions, approvals (approvals = prescrições na visão aluno)
    if (role === UserRole.COORDINATOR || role === UserRole.PROFESSOR) return 11; // Tudo exceto menu-nodes
    return 12;
  }

  async overview(
    user: UserEntity,
    params: { appId?: number; courseId?: number; periodDays?: number; date?: string; startDate?: string; endDate?: string },
  ) {
    const scoped = this.applyScope(user, params);
    const { since, until, periodDays } = this.getRangeFromParams(scoped);
    const appId = scoped.appId;
    const courseId = scoped.courseId;
    const studentId = user.role === UserRole.STUDENT ? user.id : null;

    // 1. Buscas base independentes e otimizadas
    const appsTask = (async () => {
      const qb = this.appsRepo.createQueryBuilder('a').orderBy('a.id', 'ASC');
      const effectiveAppsFilter = user.role === UserRole.ADMIN ? null : user.appId ?? appId;
      if (effectiveAppsFilter) qb.where('a.id = :appId', { appId: effectiveAppsFilter });
      return qb.getManyAndCount();
    })();

    const coursesTask = (async () => {
      const qb = this.coursesRepo.createQueryBuilder('c').orderBy('c.id', 'ASC').where('1=1');
      if (appId) qb.andWhere('c.appId = :appId', { appId });
      if (courseId) qb.andWhere('c.id = :courseId', { courseId });
      return qb.getMany();
    })();

    const pendingPrescriptionsTask = (async () => {
      const qb = this.prescriptionsRepo
        .createQueryBuilder('p')
        .where('p.status = :st', { st: PrescriptionStatus.PENDING })
        .andWhere('p.createdAt >= :since AND p.createdAt < :until', { since, until });

      if (courseId || studentId) {
        qb.innerJoin(PatientEntity, 'pt', 'pt.id = p.patientId');
        if (courseId) qb.andWhere('pt.courseId = :courseId', { courseId });
        if (studentId) qb.andWhere('pt.studentId = :studentId', { studentId });
      }

      if (appId) qb.andWhere('p.appId = :appId', { appId });
      return qb.getCount();
    })();

    const adherenceTask = (async () => {
      const qb = this.executionsRepo
        .createQueryBuilder('e')
        .select('COUNT(*)', 'total')
        .addSelect(`SUM(CASE WHEN e.status = :completed THEN 1 ELSE 0 END)`, 'completed')
        .where('e.performedAt >= :since AND e.performedAt < :until', { since, until })
        .setParameter('completed', ExecutionStatus.COMPLETED);

      if (appId || courseId || studentId) {
        qb.innerJoin(PatientEntity, 'pt', 'pt.id = e.patientId');
        if (appId) qb.andWhere('pt.appId = :appId', { appId });
        if (courseId) qb.andWhere('pt.courseId = :courseId', { courseId });
        if (studentId) qb.andWhere('pt.studentId = :studentId', { studentId });
      }

      const res = await qb.getRawOne<{ total: string; completed: string | null }>();
      const total = Number(res?.total ?? 0);
      const completed = Number(res?.completed ?? 0);
      return total > 0 ? Math.max(0, Math.min(1, completed / total)) : null;
    })();

    const patientsCountTask = (async () => {
      const qb = this.patientsRepo.createQueryBuilder('pt').where('1=1');
      if (appId) qb.andWhere('pt.appId = :appId', { appId });
      if (courseId) qb.andWhere('pt.courseId = :courseId', { courseId });
      if (studentId) qb.andWhere('pt.studentId = :studentId', { studentId });
      return qb.getCount();
    })();

    // Otimização: Contagens de Usuários e Categorias podem ser resolvidas em paralelo
    const usersCountTask =
      user.role === UserRole.ADMIN
        ? (async () => {
            const qb = this.usersRepo.createQueryBuilder('u').where('1=1');
            if (appId) qb.andWhere('u.appId = :appId', { appId });
            if (courseId) qb.andWhere('u.courseId = :courseId', { courseId });
            return qb.getCount();
          })()
        : Promise.resolve(undefined);

    const studentsCountTask =
      user.role === UserRole.ADMIN || user.role === UserRole.COORDINATOR
        ? (async () => {
            const qb = this.usersRepo
              .createQueryBuilder('u')
              .where('u.role = :role', { role: UserRole.STUDENT });
            if (appId) qb.andWhere('u.appId = :appId', { appId });
            if (courseId) qb.andWhere('u.courseId = :courseId', { courseId });
            return qb.getCount();
          })()
        : Promise.resolve(undefined);

    const categoriesTask =
      user.role === UserRole.ADMIN
        ? Promise.all([
            this.categoriesRepo.count(),
            this.categoriesRepo
              .createQueryBuilder('c')
              .where('c.parent_id IS NOT NULL')
              .getCount(),
          ])
        : Promise.resolve([undefined, undefined]);

    const [
      [appsList, appsCount],
      coursesList,
      pendingPrescriptions,
      adherenceRate,
      patientsCount,
      usersCount,
      studentsCount,
      [categoriesTotal, subcategoriesCount],
    ] = await Promise.all([
      appsTask,
      coursesTask,
      pendingPrescriptionsTask,
      adherenceTask,
      patientsCountTask,
      usersCountTask,
      studentsCountTask,
      categoriesTask,
    ]);

    // 2. Agregações por curso (se houver cursos)
    const courseIds = coursesList.map((c) => c.id);
    const patientsByCourse = new Map<number, number>();
    const pendingByCourse = new Map<number, number>();
    const adherenceByCourse = new Map<number, { total: number; completed: number }>();

    if (courseIds.length) {
      const [ptsAgg, pendAgg, execAgg] = await Promise.all([
        this.patientsRepo
          .createQueryBuilder('pt')
          .select('pt.courseId', 'courseId')
          .addSelect('COUNT(*)', 'cnt')
          .where('pt.courseId IN (:...courseIds)', { courseIds })
          .groupBy('pt.courseId')
          .getRawMany<{ courseId: string; cnt: string }>(),

        this.prescriptionsRepo
          .createQueryBuilder('p')
          .innerJoin(PatientEntity, 'pt', 'pt.id = p.patientId')
          .select('pt.courseId', 'courseId')
          .addSelect('COUNT(*)', 'cnt')
          .where('p.status = :st', { st: PrescriptionStatus.PENDING })
          .andWhere('p.createdAt >= :since AND p.createdAt < :until', { since, until })
          .andWhere('pt.courseId IN (:...courseIds)', { courseIds })
          .andWhere(studentId ? 'pt.studentId = :studentId' : '1=1', { studentId })
          .groupBy('pt.courseId')
          .getRawMany<{ courseId: string; cnt: string }>(),

        this.executionsRepo
          .createQueryBuilder('e')
          .innerJoin(PatientEntity, 'pt', 'pt.id = e.patientId')
          .select('pt.courseId', 'courseId')
          .addSelect('COUNT(*)', 'total')
          .addSelect(`SUM(CASE WHEN e.status = :completed THEN 1 ELSE 0 END)`, 'completed')
          .where('e.performedAt >= :since AND e.performedAt < :until', { since, until })
          .andWhere('pt.courseId IN (:...courseIds)', { courseIds })
          .andWhere(studentId ? 'pt.studentId = :studentId' : '1=1', { studentId })
          .setParameter('completed', ExecutionStatus.COMPLETED)
          .groupBy('pt.courseId')
          .getRawMany<{ courseId: string; total: string; completed: string }>(),
      ]);

      for (const r of ptsAgg) patientsByCourse.set(Number(r.courseId), Number(r.cnt));
      for (const r of pendAgg) pendingByCourse.set(Number(r.courseId), Number(r.cnt));
      for (const r of execAgg) {
        adherenceByCourse.set(Number(r.courseId), {
          total: Number(r.total),
          completed: Number(r.completed),
        });
      }
    }

    const coursesEnriched = coursesList.map((c) => {
      const pts = patientsByCourse.get(c.id) ?? 0;
      const pend = pendingByCourse.get(c.id) ?? 0;
      const ex = adherenceByCourse.get(c.id);
      const rate = ex && ex.total > 0 ? Math.max(0, Math.min(1, ex.completed / ex.total)) : null;
      return {
        id: c.id,
        name: c.name,
        appId: c.appId,
        active: c.active,
        patients: pts,
        pendingPrescriptions: pend,
        adherenceRate: rate,
      };
    });

    const payload: DashboardOverview = {
      viewer: {
        role: user.role,
        appId: user.appId,
        courseId: user.courseId,
      },
      filters: {
        appId: appId ?? null,
        courseId: courseId ?? null,
        periodDays,
        since: since.toISOString(),
        until: until.toISOString(),
      },
      cards: {
        apps: user.role === UserRole.ADMIN ? appsCount : user.appId ?? appId ? 1 : appsCount,
        courses: coursesList.length,
        pendingPrescriptions,
        adherenceRate,
        users: usersCount,
        patients: patientsCount,
        students: studentsCount,
        myPatients: user.role === UserRole.STUDENT ? patientsCount : undefined,
        categories: categoriesTotal,
        subcategories: subcategoriesCount,
        reportsCreated: this.getReportsCount(user.role),
        // Novas métricas sugeridas
        activePatients: await (async () => {
          const qb = this.executionsRepo
            .createQueryBuilder('e')
            .select('COUNT(DISTINCT e.patientId)', 'cnt')
            .where('e.performedAt >= :since', { since });
          if (appId || courseId) {
            qb.innerJoin(PatientEntity, 'pt', 'pt.id = e.patientId');
            if (appId) qb.andWhere('pt.appId = :appId', { appId });
            if (courseId) qb.andWhere('pt.courseId = :courseId', { courseId });
          }
          if (studentId) qb.andWhere('e.patientId IN (SELECT ptt.id FROM patients ptt WHERE ptt.student_id = :studentId)', { studentId });
          const res = await qb.getRawOne<{ cnt: string }>();
          return Number(res?.cnt ?? 0);
        })(),
        highRiskPatients: await (async () => {
          const qb = this.patientsRepo
            .createQueryBuilder('pt')
            .where('pt.latestRiskLevel = :risk', { risk: 'RED' });
          if (appId) qb.andWhere('pt.appId = :appId', { appId });
          if (courseId) qb.andWhere('pt.courseId = :courseId', { courseId });
          if (studentId) qb.andWhere('pt.studentId = :studentId', { studentId });
          return qb.getCount();
        })(),
      },
      lists: {
        courses: coursesEnriched,
        apps: appsList.map((a) => ({ id: a.id, name: a.name, active: a.active })),
      },
    };

    return payload;
  }

  async exportCsv(user: UserEntity, params: { appId?: number; courseId?: number; periodDays?: number }) {
    const overview = await this.overview(user, params);
    const header = [
      'periodDays',
      'since',
      'until',
      'appId',
      'courseId',
      'apps',
      'courses',
      'pendingPrescriptions',
      'adherenceRate',
    ];
    const row = [
      String(overview.filters.periodDays),
      overview.filters.since,
      overview.filters.until,
      overview.filters.appId == null ? '' : String(overview.filters.appId),
      overview.filters.courseId == null ? '' : String(overview.filters.courseId),
      String(overview.cards.apps),
      String(overview.cards.courses),
      String(overview.cards.pendingPrescriptions),
      overview.cards.adherenceRate == null ? '' : overview.cards.adherenceRate.toFixed(4),
    ];

    const lines: string[] = [];
    lines.push(header.join(','));
    lines.push(row.map((v) => this.csvCell(v)).join(','));

    lines.push('');
    lines.push('Courses');
    lines.push(
      [
        'courseId',
        'courseName',
        'appId',
        'active',
        'patients',
        'pendingPrescriptions',
        'adherenceRate',
      ].join(','),
    );
    for (const c of overview.lists.courses) {
      lines.push(
        [
          String(c.id),
          this.csvCell(c.name),
          String(c.appId),
          String(c.active),
          String(c.patients),
          String(c.pendingPrescriptions),
          c.adherenceRate == null ? '' : c.adherenceRate.toFixed(4),
        ].join(','),
      );
    }

    return lines.join('\n');
  }

  async exportDetailedCsv(
    user: UserEntity,
    params: { appId?: number; courseId?: number; periodDays?: number; date?: string; startDate?: string; endDate?: string },
  ) {
    const scoped = this.applyScope(user, params);
    const { since, until, periodDays } = this.getRangeFromParams(scoped);
    const appId = scoped.appId;
    const courseId = scoped.courseId;
    const studentId = user.role === UserRole.STUDENT ? user.id : null;

    // Prescriptions created in range, with patient/course.
    const qb = this.prescriptionsRepo
      .createQueryBuilder('p')
      .innerJoin(PatientEntity, 'pt', 'pt.id = p.patientId')
      .innerJoin(CourseEntity, 'c', 'c.id = pt.courseId')
      .innerJoin(AppEntity, 'a', 'a.id = p.appId')
      .select('p.id', 'prescriptionId')
      .addSelect('p.status', 'status')
      .addSelect('p.createdAt', 'createdAt')
      .addSelect('p.appId', 'appId')
      .addSelect('a.name', 'appName')
      .addSelect('pt.courseId', 'courseId')
      .addSelect('c.name', 'courseName')
      .addSelect('p.patientId', 'patientId')
      .addSelect('p.studentId', 'studentId')
      .addSelect('p.professorId', 'professorId')
      .where('p.createdAt >= :since AND p.createdAt < :until', { since, until })
      .orderBy('p.createdAt', 'DESC');
    if (appId) qb.andWhere('p.appId = :appId', { appId });
    if (courseId) qb.andWhere('pt.courseId = :courseId', { courseId });
    if (studentId) qb.andWhere('pt.studentId = :studentId', { studentId });

    const rows = await qb.getRawMany<{
      prescriptionId: number;
      status: string;
      createdAt: Date;
      appId: number;
      appName: string;
      courseId: number;
      courseName: string;
      patientId: number;
      studentId: number;
      professorId: number | null;
    }>();

    const lines: string[] = [];
    lines.push(
      [
        'periodDays',
        'since',
        'until',
        'appId',
        'courseId',
        'prescriptionId',
        'status',
        'createdAt',
        'appName',
        'courseName',
        'patientId',
        'studentId',
        'professorId',
      ].join(','),
    );
    for (const r of rows) {
      lines.push(
        [
          String(periodDays),
          since.toISOString(),
          until.toISOString(),
          appId ? String(appId) : '',
          courseId ? String(courseId) : '',
          String(r.prescriptionId),
          this.csvCell(String(r.status)),
          new Date(r.createdAt).toISOString(),
          this.csvCell(String(r.appName)),
          this.csvCell(String(r.courseName)),
          String(r.patientId),
          String(r.studentId),
          r.professorId == null ? '' : String(r.professorId),
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  private csvCell(value: string) {
    const needsQuotes = /[",\n\r]/.test(value);
    const escaped = value.replaceAll('"', '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }
}

