import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { RequestContext } from '../../common/http/request-context';
import { AppEntity } from '../../database/entities/app.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { PatientAssessmentEntity } from '../../database/entities/patient-assessment.entity';
import { CareEpisodeStatus, PatientRiskLevel, UserRole } from '../../database/entities/enums';
import {
  mapCareEpisodeEntity,
  toDateOnly,
  utcDateFromYmd,
  type CareEpisodeResponse,
} from './care-episode.types';
import { PaginatedResult } from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { CreateTriageDto } from './dto/create-triage.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

export type PatientResponse = {
  id: number;
  userId: number;
  name: string;
  email: string;
  active: boolean;
  studentId: number;
  studentName: string;
  professorId: number | null;
  professorName: string | null;
  courseId: number;
  appId: number;
  latestRiskLevel: PatientRiskLevel;
  createdAt: Date;
};

export type PatientDetailResponse = PatientResponse & {
  careEpisodes: CareEpisodeResponse[];
};

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(PatientCareEpisodeEntity)
    private readonly careEpisodes: Repository<PatientCareEpisodeEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptions: Repository<PrescriptionEntity>,
    @InjectRepository(PatientAssessmentEntity)
    private readonly assessments: Repository<PatientAssessmentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
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

  /** Escopo de curso/app para não-admin. */
  private assertActorInCourse(actor: UserEntity, courseId: number, appId: number) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.appId != null && actor.appId !== appId) {
      throw new ForbiddenException('Fora do aplicativo do seu usuário.');
    }
    if (actor.courseId != null && actor.courseId !== courseId) {
      throw new ForbiddenException('Fora do curso do seu usuário.');
    }
  }

  private canAssignStudentProfessor(actor: UserEntity): boolean {
    return (
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.COORDINATOR ||
      actor.role === UserRole.PROFESSOR
    );
  }

  private async loadParticipantUser(
    id: number,
    role: UserRole,
    courseId: number,
    appId: number,
  ): Promise<UserEntity> {
    const u = await this.users.findOne({
      where: { id, role, deletedAt: IsNull() },
    });
    if (!u) {
      throw new BadRequestException(
        role === UserRole.STUDENT ? 'Estagiário inválido ou inativo.' : 'Professor inválido ou inativo.',
      );
    }
    if (u.courseId !== courseId || u.appId !== appId) {
      throw new BadRequestException('Estagiário ou professor deve pertencer ao mesmo curso e app do paciente.');
    }
    return u;
  }

  /**
   * Paciente após checagem de escopo (para subserviços como episódios de cuidado).
   */
  async loadPatientWithAccess(actor: UserEntity, patientId: number): Promise<PatientEntity> {
    const row = await this.patients.findOne({
      where: { id: patientId },
      relations: { user: true },
    });
    if (!row || !row.user || row.user.deletedAt) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    this.assertActorInCourse(actor, row.courseId, row.appId);
    if (actor.role === UserRole.STUDENT && row.studentId !== actor.id) {
      throw new ForbiddenException('Sem permissão para ver este paciente.');
    }
    return row;
  }

  private async careEpisodePrescriptionCounts(
    patientId: number,
    episodeIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (episodeIds.length === 0) return map;
    const raw = await this.prescriptions
      .createQueryBuilder('rx')
      .select('rx.careEpisodeId', 'eid')
      .addSelect('COUNT(*)', 'cnt')
      .where('rx.patientId = :pid', { pid: patientId })
      .andWhere('rx.careEpisodeId IN (:...ids)', { ids: episodeIds })
      .groupBy('rx.careEpisodeId')
      .getRawMany<{ eid: number | null; cnt: string }>();
    for (const r of raw) {
      if (r.eid != null) map.set(Number(r.eid), Number(r.cnt));
    }
    return map;
  }

  private mapRow(row: PatientEntity): PatientResponse {
    const u = row.user;
    const st = row.student;
    const prof = row.professor;
    if (!u || !st) {
      throw new BadRequestException('Dados do paciente incompletos.');
    }
    return {
      id: row.id,
      userId: row.userId,
      name: u.name,
      email: u.email,
      active: u.active,
      studentId: row.studentId,
      studentName: st.name,
      professorId: row.professorId,
      professorName: prof?.name ?? null,
      courseId: row.courseId,
      appId: row.appId,
      latestRiskLevel: row.latestRiskLevel,
      createdAt: u.createdAt,
    };
  }

  async list(
    actor: UserEntity,
    courseId: number,
    appId: number,
    opts: { page: number; limit: number; q?: string },
  ): Promise<PaginatedResult<PatientResponse>> {
    await this.assertCourseAppMatch(courseId, appId);
    this.assertActorInCourse(actor, courseId, appId);

    const qb = this.patients
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('p.student', 'st')
      .leftJoinAndSelect('p.professor', 'prof')
      .where('p.courseId = :courseId AND p.appId = :appId', { courseId, appId })
      .andWhere('u.deletedAt IS NULL');

    if (actor.role === UserRole.STUDENT) {
      qb.andWhere('p.studentId = :sid', { sid: actor.id });
    }

    const qt = opts.q?.trim();
    if (qt) {
      const like = `%${qt.toLowerCase()}%`;
      qb.andWhere('(LOWER(u.name) LIKE :like OR LOWER(u.email) LIKE :like)', { like });
    }

    const total = await qb.getCount();
    const skip = (opts.page - 1) * opts.limit;
    const rows = await qb
      .orderBy('u.name', 'ASC')
      .addOrderBy('p.id', 'ASC')
      .skip(skip)
      .take(opts.limit)
      .getMany();

    return {
      data: rows.map((r) => this.mapRow(r)),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async get(actor: UserEntity, id: number): Promise<PatientDetailResponse> {
    const row = await this.patients.findOne({
      where: { id },
      relations: { user: true, student: true, professor: true },
    });
    if (!row || !row.user || row.user.deletedAt) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    this.assertActorInCourse(actor, row.courseId, row.appId);
    if (actor.role === UserRole.STUDENT && row.studentId !== actor.id) {
      throw new ForbiddenException('Sem permissão para ver este paciente.');
    }
    const episodes = await this.careEpisodes.find({
      where: { patientId: id },
      relations: { clinicalCase: true },
      order: { startedAt: 'DESC', id: 'DESC' },
    });
    const eids = episodes.map((e) => e.id);
    const counts = await this.careEpisodePrescriptionCounts(id, eids);
    const careEpisodes = episodes.map((e) => mapCareEpisodeEntity(e, counts.get(e.id) ?? 0));
    return { ...this.mapRow(row), careEpisodes };
  }

  async create(actor: UserEntity, dto: CreatePatientDto, ctx: RequestContext | null): Promise<PatientResponse> {
    await this.assertCourseAppMatch(dto.courseId, dto.appId);
    this.assertActorInCourse(actor, dto.courseId, dto.appId);

    let studentId: number;
    if (actor.role === UserRole.STUDENT) {
      studentId = actor.id;
    } else {
      if (dto.studentId == null) {
        throw new BadRequestException('Informe o estagiário responsável.');
      }
      studentId = dto.studentId;
    }

    await this.loadParticipantUser(studentId, UserRole.STUDENT, dto.courseId, dto.appId);

    let professorId: number | null = null;
    if (actor.role === UserRole.STUDENT) {
      professorId = null;
    } else {
      professorId = dto.professorId ?? null;
      if (professorId != null) {
        await this.loadParticipantUser(professorId, UserRole.PROFESSOR, dto.courseId, dto.appId);
      } else if (actor.role === UserRole.PROFESSOR) {
        professorId = actor.id;
      }
    }

    const email = dto.email.trim().toLowerCase();
    const dup = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .andWhere('u.deletedAt IS NULL')
      .getOne();
    if (dup) throw new BadRequestException('E-mail já cadastrado.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const active = dto.active ?? true;

    const patientId = await this.dataSource.transaction(async (em) => {
      const uRepo = em.getRepository(UserEntity);
      const pRepo = em.getRepository(PatientEntity);
      const epRepo = em.getRepository(PatientCareEpisodeEntity);

      const userRow = uRepo.create({
        name: dto.name.trim(),
        email,
        password: passwordHash,
        role: UserRole.PATIENT,
        appId: dto.appId,
        courseId: dto.courseId,
        active,
        activeFrom: null,
        activeUntil: null,
      });
      const savedUser = await uRepo.save(userRow);

      const pat = pRepo.create({
        userId: savedUser.id,
        studentId,
        professorId,
        courseId: dto.courseId,
        appId: dto.appId,
      });
      const savedPat = await pRepo.save(pat);
      await epRepo.save(
        epRepo.create({
          patientId: savedPat.id,
          title: 'Acompanhamento geral',
          description: null,
          clinicalCaseId: null,
          status: CareEpisodeStatus.ACTIVE,
          startedAt: utcDateFromYmd(toDateOnly(new Date())),
          endedAt: null,
        }),
      );
      return savedPat.id;
    });

    await this.audit.log({
      userId: actor.id,
      action: 'PATIENT_CREATE',
      entity: 'Patient',
      entityId: String(patientId),
      metadata: { email, courseId: dto.courseId, studentId },
      ctx,
    });

    return this.get(actor, patientId);
  }

  async update(
    actor: UserEntity,
    id: number,
    dto: UpdatePatientDto,
    ctx: RequestContext | null,
  ): Promise<PatientResponse> {
    const row = await this.patients.findOne({
      where: { id },
      relations: { user: true, student: true, professor: true },
    });
    if (!row || !row.user || row.user.deletedAt) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    this.assertActorInCourse(actor, row.courseId, row.appId);
    if (actor.role === UserRole.STUDENT && row.studentId !== actor.id) {
      throw new ForbiddenException('Sem permissão para editar este paciente.');
    }

    const u = row.user;

    if (dto.password != null && dto.password !== '') {
      if (dto.password.length < 6) {
        throw new BadRequestException('Senha deve ter ao menos 6 caracteres.');
      }
      u.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.name !== undefined) u.name = dto.name.trim();
    if (dto.email !== undefined) {
      const normalized = dto.email.trim().toLowerCase();
      const dup = await this.users
        .createQueryBuilder('usr')
        .where('LOWER(usr.email) = LOWER(:email)', { email: normalized })
        .andWhere('usr.id != :id', { id: u.id })
        .andWhere('usr.deletedAt IS NULL')
        .getOne();
      if (dup) throw new BadRequestException('E-mail já cadastrado.');
      u.email = normalized;
    }
    if (dto.active !== undefined) u.active = dto.active;

    if (dto.studentId !== undefined || dto.professorId !== undefined) {
      if (!this.canAssignStudentProfessor(actor)) {
        throw new ForbiddenException('Sem permissão para alterar estagiário ou professor.');
      }
    }

    const prevStudentId = row.studentId;
    const prevProfessorId = row.professorId;

    if (dto.studentId !== undefined) {
      await this.loadParticipantUser(dto.studentId, UserRole.STUDENT, row.courseId, row.appId);
      row.studentId = dto.studentId;
    }

    if (dto.professorId !== undefined) {
      if (dto.professorId == null) {
        row.professorId = null;
      } else {
        await this.loadParticipantUser(dto.professorId, UserRole.PROFESSOR, row.courseId, row.appId);
        row.professorId = dto.professorId;
      }
    }

    await this.users.save(u);
    await this.patients.save(row);

    const assignment: {
      studentId?: { from: number; to: number };
      professorId?: { from: number | null; to: number | null };
    } = {};
    if (dto.studentId !== undefined && row.studentId !== prevStudentId) {
      assignment.studentId = { from: prevStudentId, to: row.studentId };
    }
    if (dto.professorId !== undefined && row.professorId !== prevProfessorId) {
      assignment.professorId = { from: prevProfessorId, to: row.professorId };
    }

    await this.audit.log({
      userId: actor.id,
      action: 'PATIENT_UPDATE',
      entity: 'Patient',
      entityId: String(id),
      metadata: {
        changed: Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined),
        ...(Object.keys(assignment).length ? { assignment } : {}),
      },
      ctx,
    });

    return this.get(actor, id);
  }

  async remove(actor: UserEntity, id: number, ctx: RequestContext | null): Promise<{ ok: true }> {
    const row = await this.patients.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!row || !row.user || row.user.deletedAt) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    this.assertActorInCourse(actor, row.courseId, row.appId);
    if (actor.role === UserRole.STUDENT && row.studentId !== actor.id) {
      throw new ForbiddenException('Sem permissão para excluir este paciente.');
    }
    if (actor.role === UserRole.STUDENT) {
      throw new ForbiddenException('Estagiários não podem excluir pacientes.');
    }

    const rx = await this.prescriptions.count({ where: { patientId: id } });
    if (rx > 0) {
      throw new BadRequestException(
        'Não é possível excluir: há prescrições vinculadas. Inative o acesso do paciente ou arquive as prescrições antes.',
      );
    }

    const userId = row.userId;

    await this.dataSource.transaction(async (em) => {
      await em.getRepository(PatientEntity).delete({ id });
      await em.getRepository(UserEntity).update(
        { id: userId },
        {
          deletedAt: new Date(),
          active: false,
        },
      );
    });

    await this.audit.log({
      userId: actor.id,
      action: 'PATIENT_DELETE',
      entity: 'Patient',
      entityId: String(id),
      metadata: { userId },
      ctx,
    });

    return { ok: true };
  }

  async createTriage(
    actor: UserEntity,
    patientId: number,
    dto: CreateTriageDto,
    ctx: RequestContext | null,
  ): Promise<PatientAssessmentEntity> {
    const patient = await this.loadPatientWithAccess(actor, patientId);

    const triage = await this.dataSource.transaction(async (em) => {
      const aRepo = em.getRepository(PatientAssessmentEntity);
      const pRepo = em.getRepository(PatientEntity);

      const created = aRepo.create({
        ...dto,
        patientId: patient.id,
        assessorId: actor.id,
      });

      const saved = await aRepo.save(created);

      // Atualiza o nível de risco mais recente no paciente
      await pRepo.update(patient.id, {
        latestRiskLevel: dto.riskLevel,
      });

      return saved;
    });

    await this.audit.log({
      userId: actor.id,
      action: 'PATIENT_TRIAGE_CREATE',
      entity: 'PatientAssessment',
      entityId: String(triage.id),
      metadata: { patientId: patient.id, riskLevel: dto.riskLevel },
      ctx,
    });

    return triage;
  }

  async listTriages(actor: UserEntity, patientId: number): Promise<PatientAssessmentEntity[]> {
    const patient = await this.loadPatientWithAccess(actor, patientId);
    return this.assessments.find({
      where: { patientId: patient.id },
      relations: { assessor: true },
      order: { createdAt: 'DESC' },
    });
  }
}
