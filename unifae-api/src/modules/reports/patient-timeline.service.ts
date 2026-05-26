import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PatientExecutionEntity } from '../../database/entities/patient-execution.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { PatientAssessmentEntity } from '../../database/entities/patient-assessment.entity';
import { PrescriptionStatus, UserRole } from '../../database/entities/enums';
import { PatientsService } from '../patients/patients.service';

export type PatientTimelineQuery = {
  patientId: number;
  from?: string;
  to?: string;
};

export type PatientTimelineEvent = {
  kind: string;
  at: string;
  title: string;
  narrative: string;
  detail: Record<string, unknown>;
};

function startOfDayUtc(isoDate: string): Date {
  const d = isoDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new BadRequestException('Parâmetro "from" ou "to" deve ser data AAAA-MM-DD.');
  }
  return new Date(`${d}T00:00:00.000Z`);
}

function endOfDayUtc(isoDate: string): Date {
  const d = isoDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new BadRequestException('Parâmetro "from" ou "to" deve ser data AAAA-MM-DD.');
  }
  return new Date(`${d}T23:59:59.999Z`);
}

@Injectable()
export class PatientTimelineService {
  constructor(
    private readonly patientsService: PatientsService,
    @InjectRepository(PatientEntity)
    private readonly patientRepo: Repository<PatientEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptionRepo: Repository<PrescriptionEntity>,
    @InjectRepository(PatientExecutionEntity)
    private readonly executionRepo: Repository<PatientExecutionEntity>,
    @InjectRepository(PatientCareEpisodeEntity)
    private readonly episodeRepo: Repository<PatientCareEpisodeEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PatientAssessmentEntity)
    private readonly assessmentRepo: Repository<PatientAssessmentEntity>,
  ) {}

  private async namesForIds(ids: (number | null | undefined)[]): Promise<Map<number, string>> {
    const unique = [...new Set(ids.filter((x): x is number => x != null && Number.isFinite(x)))];
    if (unique.length === 0) return new Map();
    const rows = await this.userRepo.find({
      where: { id: In(unique) },
      select: ['id', 'name'],
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  async build(actor: UserEntity, q: PatientTimelineQuery): Promise<{
    patient: Record<string, unknown>;
    courseCoordinators: { id: number; name: string; email: string }[];
    range: { from: string | null; to: string | null };
    events: PatientTimelineEvent[];
  }> {
    await this.patientsService.loadPatientWithAccess(actor, q.patientId);

    const patient = await this.patientRepo.findOne({
      where: { id: q.patientId },
      relations: { user: true, student: true, professor: true, course: true, app: true },
    });
    if (!patient?.user || patient.user.deletedAt) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    const fromD = q.from?.trim() ? startOfDayUtc(q.from) : null;
    const toD = q.to?.trim() ? endOfDayUtc(q.to) : null;

    const inRange = (d: Date) => {
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    };

    const coordinators = await this.userRepo.find({
      where: {
        role: UserRole.COORDINATOR,
        courseId: patient.courseId,
        deletedAt: IsNull(),
      },
      select: ['id', 'name', 'email'],
      order: { name: 'ASC' },
      take: 24,
    });

    const episodes = await this.episodeRepo.find({
      where: { patientId: patient.id },
      relations: { clinicalCase: true },
      order: { id: 'ASC' },
    });

    const prescriptions = await this.prescriptionRepo.find({
      where: { patientId: patient.id },
      relations: {
        student: true,
        professor: true,
        careEpisode: { clinicalCase: true },
        decidedBy: true,
        items: { exercise: true },
      },
      order: { createdAt: 'ASC' },
    });

    const executions = await this.executionRepo.find({
      where: { patientId: patient.id },
      relations: { prescriptionItem: { exercise: true, prescription: true } },
      order: { performedAt: 'ASC' },
    });

    const patientAudits = await this.auditRepo.find({
      where: { entity: 'Patient', entityId: String(patient.id) },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    const assessments = await this.assessmentRepo.find({
      where: { patientId: patient.id },
      order: { createdAt: 'ASC' },
    });

    const rxIds = prescriptions.map((r) => r.id);
    const rxAudits =
      rxIds.length === 0
        ? []
        : await this.auditRepo
            .createQueryBuilder('a')
            .leftJoinAndSelect('a.user', 'u')
            .where('a.entity = :ent', { ent: 'Prescription' })
            .andWhere('a.entityId IN (:...ids)', { ids: rxIds.map(String) })
            .orderBy('a.createdAt', 'ASC')
            .getMany();

    const events: PatientTimelineEvent[] = [];

    const regAt = patient.user.createdAt;
    if (inRange(regAt)) {
      events.push({
        kind: 'patient_account_created',
        at: regAt.toISOString(),
        title: 'Conta no aplicativo',
        narrative: `${patient.user.name} passou a ter acesso ao aplicativo como paciente.`,
        detail: { userId: patient.userId },
      });
    }

    for (const a of patientAudits) {
      if (a.action === 'PATIENT_CREATE' && inRange(a.createdAt)) {
        const meta = (a.metadata ?? {}) as Record<string, unknown>;
        events.push({
          kind: 'patient_enrolled',
          at: a.createdAt.toISOString(),
          title: 'Cadastro no curso',
          narrative: `Paciente vinculado ao curso (cadastro no hub).${a.user?.name ? ` Registrado por ${a.user.name}.` : ''}`,
          detail: {
            actorUserId: a.userId,
            actorName: a.user?.name ?? null,
            initialStudentId: meta.studentId ?? null,
            courseId: meta.courseId ?? patient.courseId,
          },
        });
      }
      if (a.action === 'PATIENT_UPDATE' && inRange(a.createdAt)) {
        const meta = (a.metadata ?? {}) as {
          assignment?: {
            studentId?: { from: number; to: number };
            professorId?: { from: number | null; to: number | null };
          };
        };
        const asg = meta.assignment;
        if (asg && (asg.studentId || asg.professorId)) {
          const ids: number[] = [];
          if (asg.studentId) {
            ids.push(asg.studentId.from, asg.studentId.to);
          }
          if (asg.professorId) {
            if (asg.professorId.from != null) ids.push(asg.professorId.from);
            if (asg.professorId.to != null) ids.push(asg.professorId.to);
          }
          const names = await this.namesForIds(ids);
          const parts: string[] = [];
          if (asg.studentId) {
            const f = names.get(asg.studentId.from) ?? `#${asg.studentId.from}`;
            const t = names.get(asg.studentId.to) ?? `#${asg.studentId.to}`;
            parts.push(`estagiário de «${f}» para «${t}»`);
          }
          if (asg.professorId) {
            const f =
              asg.professorId.from == null
                ? 'nenhum'
                : (names.get(asg.professorId.from) ?? `#${asg.professorId.from}`);
            const t =
              asg.professorId.to == null
                ? 'nenhum'
                : (names.get(asg.professorId.to) ?? `#${asg.professorId.to}`);
            parts.push(`professor orientador de «${f}» para «${t}»`);
          }
          events.push({
            kind: 'assignment_changed',
            at: a.createdAt.toISOString(),
            title: 'Alteração de vínculo acadêmico',
            narrative: `Alteração de ${parts.join(' e ')}.${a.user?.name ? ` Responsável pela alteração: ${a.user.name}.` : ''}`,
            detail: {
              actorUserId: a.userId,
              actorName: a.user?.name ?? null,
              assignment: asg,
            },
          });
        }
      }
    }

    for (const ep of episodes) {
      const start = new Date(ep.startedAt);
      if (inRange(start)) {
        const cc = ep.clinicalCase?.name?.trim();
        events.push({
          kind: 'care_episode_started',
          at: start.toISOString(),
          title: `Episódio: ${ep.title}`,
          narrative: `Início do episódio de cuidado «${ep.title}»${cc ? ` (caso clínico: ${cc})` : ''}.`,
          detail: {
            episodeId: ep.id,
            title: ep.title,
            status: ep.status,
            clinicalCaseId: ep.clinicalCaseId,
            clinicalCaseName: ep.clinicalCase?.name ?? null,
          },
        });
      }
      if (ep.endedAt) {
        const end = new Date(ep.endedAt);
        if (inRange(end)) {
          events.push({
            kind: 'care_episode_closed',
            at: end.toISOString(),
            title: `Encerramento: ${ep.title}`,
            narrative: `Encerramento registrado para o episódio «${ep.title}» (status ${ep.status}).`,
            detail: { episodeId: ep.id, title: ep.title, status: ep.status },
          });
        }
      }
    }

    const auditsByRx = new Map<number, AuditLogEntity[]>();
    for (const a of rxAudits) {
      const id = Number(a.entityId);
      if (!Number.isFinite(id)) continue;
      const list = auditsByRx.get(id) ?? [];
      list.push(a);
      auditsByRx.set(id, list);
    }

    for (const rx of prescriptions) {
      if (inRange(rx.createdAt)) {
        const epTitle = rx.careEpisode?.title ?? null;
        const cc = rx.careEpisode?.clinicalCase?.name ?? null;
        const nItems = rx.items?.length ?? 0;
        const createAudit = rxAudits.find(
          (a) => a.entityId === String(rx.id) && a.action === 'PRESCRIPTION_CREATE',
        );
        events.push({
          kind: 'prescription_created',
          at: rx.createdAt.toISOString(),
          title: `Prescrição #${rx.id} (rascunho/envio)`,
          narrative: `Nova prescrição #${rx.id} elaborada por ${rx.student?.name ?? 'estagiário'} com ${nItems} exercício(s)${epTitle ? `, no episódio «${epTitle}»` : ''}${cc ? ` (${cc})` : ''}.`,
          detail: {
            prescriptionId: rx.id,
            status: rx.status,
            studentId: rx.studentId,
            studentName: rx.student?.name ?? null,
            professorId: rx.professorId,
            professorName: rx.professor?.name ?? null,
            careEpisodeId: rx.careEpisodeId,
            careEpisodeTitle: epTitle,
            clinicalCaseName: cc,
            itemsCount: nItems,
            createdByAuditUserId: createAudit?.userId ?? null,
            createdByAuditUserName: createAudit?.user?.name ?? null,
          },
        });
      }

      if (rx.status === PrescriptionStatus.PENDING) continue;

      let decidedAt: Date | null = rx.decidedAt;
      let deciderId: number | null = rx.decidedById;
      let deciderName: string | null = rx.decidedBy?.name ?? null;

      if (!decidedAt) {
        const list = auditsByRx.get(rx.id) ?? [];
        for (let i = list.length - 1; i >= 0; i--) {
          const row = list[i]!;
          if (row.action !== 'PRESCRIPTION_UPDATE') continue;
          const meta = row.metadata as { prescriptionStatus?: { to?: string } } | null;
          const to = meta?.prescriptionStatus?.to;
          if (to === 'APPROVED' || to === 'REJECTED') {
            decidedAt = row.createdAt;
            deciderId = row.userId;
            deciderName = row.user?.name ?? null;
            break;
          }
        }
      }

      if (decidedAt && inRange(decidedAt)) {
        const verb =
          rx.status === PrescriptionStatus.APPROVED
            ? 'aprovada'
            : rx.status === PrescriptionStatus.REJECTED
              ? 'rejeitada'
              : 'atualizada';
        events.push({
          kind: 'prescription_decided',
          at: decidedAt.toISOString(),
          title: `Prescrição #${rx.id} ${verb}`,
          narrative: `Prescrição #${rx.id} foi ${verb}${deciderName ? ` por ${deciderName}` : ''}.`,
          detail: {
            prescriptionId: rx.id,
            status: rx.status,
            decidedById: deciderId,
            decidedByName: deciderName,
            justification: rx.justification,
          },
        });
      }
    }

    for (const ass of assessments) {
      if (inRange(ass.createdAt)) {
        const flagLabel = {
          RED: 'Vermelha (Crítico)',
          YELLOW: 'Amarela (Híbrido)',
          GREEN: 'Verde (Estável/App)',
          PENDING: 'Pendente',
        }[ass.riskLevel];

        const literacyLabel = {
          Baixo: 'Baixa',
          Médio: 'Média',
          Alto: 'Alta',
        }[ass.digitalLiteracyScore] || ass.digitalLiteracyScore;

        events.push({
          kind: 'patient_triage',
          at: ass.createdAt.toISOString(),
          title: `Triagem: Bandeira ${flagLabel}`,
          narrative: `Avaliação integral realizada. Alfabetização Digital: ${literacyLabel}. Justificativa: ${ass.justification || '—'}`,
          detail: {
            assessmentId: ass.id,
            riskLevel: ass.riskLevel,
            digitalLiteracyScore: ass.digitalLiteracyScore,
            functionDetails: ass.functionDetails,
            symptomsDetails: ass.symptomsDetails,
            safetyDetails: ass.safetyDetails,
            socialSupportDetails: ass.socialSupportDetails,
            justification: ass.justification,
          },
        });
      }
    }

    const exFiltered = executions.filter((e) => inRange(e.performedAt));
    const byDay = new Map<string, PatientExecutionEntity[]>();
    for (const e of exFiltered) {
      const key = e.performedAt.toISOString().slice(0, 10);
      const arr = byDay.get(key) ?? [];
      arr.push(e);
      byDay.set(key, arr);
    }
    for (const [day, list] of byDay) {
      const at = new Date(`${day}T12:00:00.000Z`);
      if (!inRange(at)) continue;
      const exercises = list.map((e) => ({
        exerciseName: e.prescriptionItem?.exercise?.name ?? 'Exercício',
        status: e.status,
        feedback: e.feedback,
        prescriptionId: e.prescriptionItem?.prescription?.id ?? null,
      }));
      const names = [...new Set(exercises.map((x) => x.exerciseName))].slice(0, 8);
      const extra = exercises.length > names.length ? ` (+${exercises.length - names.length})` : '';
      events.push({
        kind: 'exercise_day',
        at: at.toISOString(),
        title: `Práticas em ${day}`,
        narrative: `No dia ${day}, o paciente registrou ${list.length} prática(s): ${names.join(', ')}${extra}.`,
        detail: { date: day, sessions: exercises },
      });
    }

    events.sort((a, b) => a.at.localeCompare(b.at));

    return {
      patient: {
        id: patient.id,
        name: patient.user.name,
        email: patient.user.email,
        active: patient.user.active,
        courseId: patient.courseId,
        courseName: patient.course?.name ?? null,
        appId: patient.appId,
        appName: patient.app?.name ?? null,
        currentStudent: patient.student
          ? { id: patient.student.id, name: patient.student.name, email: patient.student.email }
          : null,
        currentProfessor: patient.professor
          ? {
              id: patient.professor.id,
              name: patient.professor.name,
              email: patient.professor.email,
            }
          : null,
      },
      courseCoordinators: coordinators.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
      })),
      range: {
        from: fromD ? q.from!.trim().slice(0, 10) : null,
        to: toD ? q.to!.trim().slice(0, 10) : null,
      },
      events,
    };
  }
}
