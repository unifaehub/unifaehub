import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CareLocationEntity,
  CourseCareLocationEntity,
  PatientAppointmentEntity,
  PatientEntity,
  UserEntity,
} from '../../database/entities';
import {
  AppointmentModality,
  AppointmentStatus,
  UserRole,
} from '../../database/entities/enums';
import { GoogleMeetService } from '../../infra/google-meet/google-meet.service';
import { CreatePatientAppointmentDto } from './dto/create-patient-appointment.dto';
import { UpdatePatientAppointmentDto } from './dto/update-patient-appointment.dto';

export type AppointmentRow = {
  id: number;
  patientId: number;
  patientName: string;
  appId: number;
  courseId: number;
  professionalUserId: number;
  professionalName: string;
  professionalRole: UserRole | null;
  scheduledAt: string;
  endsAt: string;
  durationMinutes: number;
  modality: AppointmentModality;
  status: AppointmentStatus;
  careLocationId: number | null;
  careLocationName: string | null;
  careLocationAddress: string | null;
  meetUrl: string | null;
  notes: string | null;
};

export type CalendarProfessional = {
  id: number;
  name: string;
  role: UserRole;
  isSelf: boolean;
};

export type AppointmentCalendarResponse = {
  from: string;
  to: string;
  viewMode: 'SELF' | 'TEAM' | 'ALL';
  professionals: CalendarProfessional[];
  events: AppointmentRow[];
};

@Injectable()
export class PatientAppointmentsService {
  constructor(
    @InjectRepository(PatientAppointmentEntity)
    private readonly appointments: Repository<PatientAppointmentEntity>,
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(CareLocationEntity)
    private readonly locations: Repository<CareLocationEntity>,
    @InjectRepository(CourseCareLocationEntity)
    private readonly courseLinks: Repository<CourseCareLocationEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly googleMeet: GoogleMeetService,
  ) {}

  private assertStaff(actor: UserEntity) {
    const ok = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT].includes(
      actor.role,
    );
    if (!ok) throw new ForbiddenException('Sem permissão.');
  }

  private assertCourseAppAccess(actor: UserEntity, courseId: number, appId: number) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.courseId != null && actor.courseId !== courseId) {
      throw new ForbiddenException('Agenda fora do seu curso.');
    }
    if (actor.appId != null && actor.appId !== appId) {
      throw new ForbiddenException('Agenda fora do seu aplicativo.');
    }
  }

  private weekRange(fromParam?: string) {
    const anchor = fromParam ? new Date(`${fromParam}T12:00:00`) : new Date();
    if (fromParam && Number.isNaN(anchor.getTime())) {
      throw new BadRequestException('Parâmetro from inválido. Use YYYY-MM-DD.');
    }
    const d = new Date(anchor);
    const dow = d.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const start = new Date(d);
    start.setDate(d.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end, fromKey: start.toISOString().slice(0, 10), toKey: new Date(end.getTime() - 1).toISOString().slice(0, 10) };
  }

  /** Profissionais visíveis na agenda conforme perfil (coordenadora vê a equipe do curso). */
  private async resolveVisibleProfessionals(
    actor: UserEntity,
    courseId: number,
    appId: number,
    filterProfessionalId?: number,
  ): Promise<{ ids: number[]; professionals: CalendarProfessional[]; viewMode: AppointmentCalendarResponse['viewMode'] }> {
    const teamRoles = [UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT];
    const team = await this.users
      .createQueryBuilder('u')
      .where('u.courseId = :courseId', { courseId })
      .andWhere('u.appId = :appId', { appId })
      .andWhere('u.role IN (:...roles)', { roles: teamRoles })
      .andWhere('u.deletedAt IS NULL')
      .orderBy('u.name', 'ASC')
      .addOrderBy('u.id', 'ASC')
      .getMany();

    let viewMode: AppointmentCalendarResponse['viewMode'] = 'SELF';
    let visible = team;

    if (actor.role === UserRole.ADMIN) {
      viewMode = 'ALL';
      visible = team;
    } else if (actor.role === UserRole.COORDINATOR) {
      viewMode = 'TEAM';
      visible = team;
    } else {
      visible = team.filter((u) => u.id === actor.id);
    }

    if (filterProfessionalId != null && Number.isFinite(filterProfessionalId)) {
      const allowed = visible.some((u) => u.id === filterProfessionalId);
      if (!allowed) throw new ForbiddenException('Profissional fora do seu escopo de visualização.');
      visible = visible.filter((u) => u.id === filterProfessionalId);
    }

    const professionals: CalendarProfessional[] = visible.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      isSelf: u.id === actor.id,
    }));

    return { ids: visible.map((u) => u.id), professionals, viewMode };
  }

  private mapRow(row: PatientAppointmentEntity): AppointmentRow {
    const endsAt = new Date(row.scheduledAt.getTime() + row.durationMinutes * 60_000);
    return {
      id: row.id,
      patientId: row.patientId,
      patientName: row.patient?.user?.name ?? '—',
      appId: row.appId,
      courseId: row.courseId,
      professionalUserId: row.professionalUserId,
      professionalName: row.professional?.name ?? '—',
      professionalRole: row.professional?.role ?? null,
      scheduledAt: row.scheduledAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      modality: row.modality,
      status: row.status,
      careLocationId: row.careLocationId,
      careLocationName: row.careLocation?.name ?? null,
      careLocationAddress: row.careLocation?.address ?? null,
      meetUrl: row.meetUrl,
      notes: row.notes,
    };
  }

  async listForStaff(
    actor: UserEntity,
    courseId: number,
    appId: number,
    opts?: { patientId?: number; from?: string; to?: string; professionalUserId?: number },
  ): Promise<AppointmentRow[]> {
    this.assertStaff(actor);
    if (!Number.isFinite(courseId) || !Number.isFinite(appId)) return [];
    this.assertCourseAppAccess(actor, courseId, appId);

    const scope = await this.resolveVisibleProfessionals(actor, courseId, appId, opts?.professionalUserId);
    if (!scope.ids.length) return [];

    const qb = this.appointments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('a.professional', 'prof')
      .leftJoinAndSelect('a.careLocation', 'loc')
      .where('a.courseId = :courseId', { courseId })
      .andWhere('a.appId = :appId', { appId })
      .andWhere('a.professionalUserId IN (:...profIds)', { profIds: scope.ids })
      .orderBy('a.scheduledAt', 'ASC');

    if (opts?.patientId) qb.andWhere('a.patientId = :patientId', { patientId: opts.patientId });
    if (opts?.from) qb.andWhere('a.scheduledAt >= :from', { from: new Date(opts.from) });
    if (opts?.to) qb.andWhere('a.scheduledAt < :to', { to: new Date(opts.to) });

    const rows = await qb.getMany();
    return rows.map((r) => this.mapRow(r));
  }

  async getCalendar(
    actor: UserEntity,
    courseId: number,
    appId: number,
    opts?: { from?: string; to?: string; professionalUserId?: number },
  ): Promise<AppointmentCalendarResponse> {
    this.assertStaff(actor);
    if (!Number.isFinite(courseId) || !Number.isFinite(appId)) {
      return { from: '', to: '', viewMode: 'SELF', professionals: [], events: [] };
    }
    this.assertCourseAppAccess(actor, courseId, appId);

    let start: Date;
    let end: Date;
    let fromKey: string;
    let toKey: string;
    if (opts?.from && opts?.to) {
      start = new Date(opts.from);
      end = new Date(opts.to);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException('Intervalo from/to inválido.');
      }
      fromKey = start.toISOString().slice(0, 10);
      toKey = new Date(end.getTime() - 1).toISOString().slice(0, 10);
    } else {
      const w = this.weekRange(opts?.from);
      start = w.start;
      end = w.end;
      fromKey = w.fromKey;
      toKey = w.toKey;
    }

    const scope = await this.resolveVisibleProfessionals(
      actor,
      courseId,
      appId,
      opts?.professionalUserId,
    );
    if (!scope.ids.length) {
      return {
        from: fromKey,
        to: toKey,
        viewMode: scope.viewMode,
        professionals: scope.professionals,
        events: [],
      };
    }

    const rows = await this.appointments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('a.professional', 'prof')
      .leftJoinAndSelect('a.careLocation', 'loc')
      .where('a.courseId = :courseId', { courseId })
      .andWhere('a.appId = :appId', { appId })
      .andWhere('a.professionalUserId IN (:...profIds)', { profIds: scope.ids })
      .andWhere('a.scheduledAt >= :start AND a.scheduledAt < :end', {
        start,
        end,
      })
      .orderBy('a.scheduledAt', 'ASC')
      .getMany();

    return {
      from: fromKey,
      to: toKey,
      viewMode: scope.viewMode,
      professionals: scope.professionals,
      events: rows.map((r) => this.mapRow(r)),
    };
  }

  private async assertCanManageAppointment(actor: UserEntity, row: PatientAppointmentEntity) {
    this.assertCourseAppAccess(actor, row.courseId, row.appId);
    const scope = await this.resolveVisibleProfessionals(actor, row.courseId, row.appId);
    if (!scope.ids.includes(row.professionalUserId)) {
      throw new ForbiddenException('Sem permissão para este agendamento.');
    }
    if (actor.role === UserRole.PROFESSOR || actor.role === UserRole.STUDENT) {
      if (row.professionalUserId !== actor.id) {
        throw new ForbiddenException('Você só pode alterar seus próprios agendamentos.');
      }
    }
  }

  async create(actor: UserEntity, dto: CreatePatientAppointmentDto): Promise<AppointmentRow> {
    this.assertStaff(actor);
    const patient = await this.patients.findOne({
      where: { id: dto.patientId },
      relations: { user: true, professor: true },
    });
    if (!patient?.user) throw new NotFoundException('Paciente não encontrado.');
    this.assertCourseAppAccess(actor, patient.courseId, patient.appId);

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Data/hora inválida.');
    }

    let professionalUserId = dto.professionalUserId ?? patient.professorId ?? patient.studentId;
    if (actor.role === UserRole.PROFESSOR || actor.role === UserRole.STUDENT) {
      professionalUserId = actor.id;
    }
    const professional = await this.users.findOne({ where: { id: professionalUserId } });
    if (!professional) throw new BadRequestException('Profissional responsável inválido.');

    const scope = await this.resolveVisibleProfessionals(actor, patient.courseId, patient.appId);
    if (!scope.ids.includes(professionalUserId)) {
      throw new ForbiddenException('Profissional fora do escopo permitido.');
    }

    if (dto.modality === AppointmentModality.IN_PERSON) {
      if (!dto.careLocationId) {
        throw new BadRequestException('Informe o local para atendimento presencial.');
      }
      const loc = await this.locations.findOne({ where: { id: dto.careLocationId, appId: patient.appId } });
      if (!loc?.active) throw new BadRequestException('Local de atendimento inválido ou inativo.');
      const linked = await this.courseLinks.findOne({
        where: { courseId: patient.courseId, careLocationId: loc.id },
      });
      if (!linked) {
        throw new BadRequestException('Este local não está vinculado ao curso do paciente.');
      }
    }

    let meetUrl = dto.meetUrl?.trim() || null;
    let meetCalendarEventId: string | null = null;

    if (dto.modality === AppointmentModality.ONLINE) {
      const auto = dto.autoCreateMeet !== false;
      if (auto && !meetUrl) {
        const emails = [patient.user.email, professional.email].filter(Boolean);
        const meet = await this.googleMeet.createConference({
          summary: `Consulta — ${patient.user.name}`,
          description: dto.notes ?? undefined,
          startAt: scheduledAt,
          durationMinutes: dto.durationMinutes ?? 50,
          attendeeEmails: emails,
        });
        meetUrl = meet.meetUrl;
        meetCalendarEventId = meet.calendarEventId;
      }
      if (!meetUrl) {
        throw new BadRequestException('Informe o link da reunião ou habilite a criação automática do Meet.');
      }
    }

    const saved = await this.appointments.save(
      this.appointments.create({
        patientId: patient.id,
        appId: patient.appId,
        courseId: patient.courseId,
        professionalUserId,
        createdByUserId: actor.id,
        scheduledAt,
        durationMinutes: dto.durationMinutes ?? 50,
        modality: dto.modality,
        careLocationId: dto.modality === AppointmentModality.IN_PERSON ? dto.careLocationId ?? null : null,
        meetUrl,
        meetCalendarEventId,
        status: AppointmentStatus.SCHEDULED,
        notes: dto.notes?.trim() || null,
      }),
    );

    const full = await this.appointments.findOne({
      where: { id: saved.id },
      relations: { patient: { user: true }, professional: true, careLocation: true },
    });
    return this.mapRow(full!);
  }

  async update(actor: UserEntity, id: number, dto: UpdatePatientAppointmentDto): Promise<AppointmentRow> {
    this.assertStaff(actor);
    const row = await this.appointments.findOne({
      where: { id },
      relations: { patient: { user: true }, professional: true, careLocation: true },
    });
    if (!row) throw new NotFoundException('Agendamento não encontrado.');
    await this.assertCanManageAppointment(actor, row);

    if (dto.scheduledAt) {
      const d = new Date(dto.scheduledAt);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Data/hora inválida.');
      row.scheduledAt = d;
    }
    if (dto.durationMinutes != null) row.durationMinutes = dto.durationMinutes;
    if (dto.professionalUserId != null) row.professionalUserId = dto.professionalUserId;
    if (dto.status != null) row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
    if (dto.meetUrl !== undefined) row.meetUrl = dto.meetUrl?.trim() || null;

    if (dto.modality != null) row.modality = dto.modality;
    if (dto.careLocationId !== undefined) row.careLocationId = dto.careLocationId;

    if (row.modality === AppointmentModality.IN_PERSON && !row.careLocationId) {
      throw new BadRequestException('Atendimento presencial exige local.');
    }

    await this.appointments.save(row);
    return this.mapRow(row);
  }

  async cancel(actor: UserEntity, id: number) {
    return this.update(actor, id, { status: AppointmentStatus.CANCELLED });
  }

  async listUpcomingForPatient(patientId: number, limit = 20): Promise<AppointmentRow[]> {
    const now = new Date();
    const rows = await this.appointments.find({
      where: { patientId, status: AppointmentStatus.SCHEDULED },
      relations: { patient: { user: true }, professional: true, careLocation: true },
      order: { scheduledAt: 'ASC' },
      take: limit,
    });
    return rows.filter((r) => r.scheduledAt >= now).map((r) => this.mapRow(r));
  }

  async resolveEarliestUpcomingIso(patientId: number): Promise<string | null> {
    const rows = await this.listUpcomingForPatient(patientId, 1);
    return rows[0]?.scheduledAt ?? null;
  }
}
