import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { parsePageLimit, toPaginated, type PaginatedResult } from '../../common/pagination';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { PrescriptionStatus, UserRole } from '../../database/entities/enums';

const LIST_DEFAULT = 20;
const LIST_MAX = 100;

export type NotificationRow = {
  id: number;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  private mapRow(n: NotificationEntity): NotificationRow {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      metadata: n.metadata,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async list(
    actor: UserEntity,
    params: { page?: string; limit?: string; unreadOnly?: string },
  ): Promise<PaginatedResult<NotificationRow>> {
    const { page, limit, skip } = parsePageLimit(params.page, params.limit, LIST_DEFAULT, LIST_MAX);
    const qb = this.notifications
      .createQueryBuilder('n')
      .where('n.userId = :uid', { uid: actor.id })
      .orderBy('n.createdAt', 'DESC');

    if (params.unreadOnly === 'true' || params.unreadOnly === '1') {
      qb.andWhere('n.readAt IS NULL');
    }

    const total = await qb.getCount();
    const rows = await qb.skip(skip).take(limit).getMany();
    return toPaginated(rows.map((r) => this.mapRow(r)), total, page, limit);
  }

  async unreadCount(actor: UserEntity): Promise<{ count: number }> {
    const count = await this.notifications.count({
      where: { userId: actor.id, readAt: IsNull() },
    });
    return { count };
  }

  async markRead(actor: UserEntity, id: number): Promise<NotificationRow> {
    const row = await this.notifications.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Notificação não encontrada.');
    if (row.userId !== actor.id) throw new ForbiddenException('Sem permissão.');
    row.readAt = new Date();
    await this.notifications.save(row);
    return this.mapRow(row);
  }

  async markAllRead(actor: UserEntity): Promise<{ updated: number }> {
    const r = await this.notifications.update(
      { userId: actor.id, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: r.affected ?? 0 };
  }

  /** Coordenadores e professores do curso/app (fila de aprovação). */
  async findTeamApproverIds(courseId: number, appId: number): Promise<number[]> {
    const rows = await this.users
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .where('u.deletedAt IS NULL')
      .andWhere('u.courseId = :courseId', { courseId })
      .andWhere('u.appId = :appId', { appId })
      .andWhere('u.role IN (:...roles)', {
        roles: [UserRole.COORDINATOR, UserRole.PROFESSOR],
      })
      .getRawMany<{ id: number }>();
    return rows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
  }

  async createForUsers(
    userIds: number[],
    payload: {
      type: string;
      title: string;
      body: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    const unique = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
    if (!unique.length) return;
    try {
      const batch = unique.map((userId) =>
        this.notifications.create({
          userId,
          type: payload.type,
          title: payload.title.slice(0, 200),
          body: payload.body,
          metadata: payload.metadata ?? null,
          readAt: null,
        }),
      );
      await this.notifications.save(batch);
    } catch (e) {
      this.log.warn(`Falha ao gravar notificações (${payload.type}): ${(e as Error).message}`);
    }
  }

  async notifyPrescriptionPending(params: {
    courseId: number;
    appId: number;
    studentId: number;
    prescriptionId: number;
    patientName: string;
    studentName: string;
  }): Promise<void> {
    const approvers = await this.findTeamApproverIds(params.courseId, params.appId);
    const targets = approvers.filter((id) => id !== params.studentId);
    await this.createForUsers(targets, {
      type: 'PRESCRIPTION_PENDING',
      title: 'Nova prescrição para análise',
      body: `${params.studentName} enviou uma prescrição pendente para o paciente ${params.patientName}.`,
      metadata: {
        prescriptionId: params.prescriptionId,
        patientName: params.patientName,
        route: { name: 'approvals' },
      },
    });
  }

  async notifyPrescriptionDecision(params: {
    studentId: number;
    prescriptionId: number;
    status: PrescriptionStatus.APPROVED | PrescriptionStatus.REJECTED;
    patientName: string;
    decidedByName: string;
  }): Promise<void> {
    const approved = params.status === PrescriptionStatus.APPROVED;
    await this.createForUsers([params.studentId], {
      type: approved ? 'PRESCRIPTION_APPROVED' : 'PRESCRIPTION_REJECTED',
      title: approved ? 'Prescrição aprovada' : 'Prescrição não aprovada',
      body: approved
        ? `Sua prescrição #${params.prescriptionId} (${params.patientName}) foi aprovada por ${params.decidedByName}.`
        : `Sua prescrição #${params.prescriptionId} (${params.patientName}) não foi aprovada por ${params.decidedByName}. Revise os comentários e a fila de prescrições.`,
      metadata: {
        prescriptionId: params.prescriptionId,
        route: { name: 'prescriptions', query: { highlightRx: String(params.prescriptionId) } },
      },
    });
  }

  async notifyPrescriptionRemoved(params: {
    studentId: number;
    prescriptionId: number;
    patientName: string;
    removedByName: string;
  }): Promise<void> {
    await this.createForUsers([params.studentId], {
      type: 'PRESCRIPTION_DELETED',
      title: 'Prescrição removida',
      body: `A prescrição #${params.prescriptionId} (${params.patientName}) foi excluída por ${params.removedByName}.`,
      metadata: {
        prescriptionId: params.prescriptionId,
        route: { name: 'prescriptions' },
      },
    });
  }

  async notifyUserAccountUpdated(params: {
    targetUserId: number;
    actorName: string;
    summary: string;
  }): Promise<void> {
    await this.createForUsers([params.targetUserId], {
      type: 'USER_ACCOUNT_UPDATED',
      title: 'Seu cadastro foi atualizado',
      body:
        params.summary ||
        (params.actorName
          ? `Alterações foram feitas na sua conta por ${params.actorName}.`
          : 'Sua conta foi atualizada.'),
      metadata: { route: { name: 'settings' } },
    });
  }
}
