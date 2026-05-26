import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { parsePageLimit, toPaginated, type PaginatedResult } from '../../common/pagination';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import type { RequestContext } from '../../common/http/request-context';

const AUDIT_LIST_DEFAULT = 50;
const AUDIT_LIST_MAX = 200;

/** Query string params para listagem e filtros de auditoria. */
export type AuditLogListParams = {
  page?: string;
  limit?: string;
  /** Busca ampla: ação, rota, IDs, IP, dispositivo, user-agent, JSON de metadados, nome/e-mail do usuário. */
  q?: string;
  id?: string;
  userId?: string;
  /** `true` — apenas registros sem usuário (ações anônimas / sistema). */
  userAbsent?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  ipAddress?: string;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  createdFrom?: string;
  createdTo?: string;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async facets(): Promise<{ actions: string[]; entities: string[] }> {
    const [actionRows, entityRows] = await Promise.all([
      this.auditRepo.query(
        'SELECT DISTINCT `action` AS v FROM `audit_logs` ORDER BY `action` ASC LIMIT 500',
      ) as Promise<{ v: string }[]>,
      this.auditRepo.query(
        'SELECT DISTINCT `entity` AS v FROM `audit_logs` ORDER BY `entity` ASC LIMIT 500',
      ) as Promise<{ v: string }[]>,
    ]);
    return {
      actions: actionRows.map((r) => r.v).filter(Boolean),
      entities: entityRows.map((r) => r.v).filter(Boolean),
    };
  }

  async list(params: AuditLogListParams): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, skip } = parsePageLimit(
      params.page,
      params.limit,
      AUDIT_LIST_DEFAULT,
      AUDIT_LIST_MAX,
    );

    const qb = this.auditRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .orderBy('a.createdAt', 'DESC');

    const idNum = params.id?.trim() ? parseInt(params.id.trim(), 10) : NaN;
    if (Number.isFinite(idNum)) {
      qb.andWhere('a.id = :id', { id: idNum });
    }

    const absent =
      params.userAbsent === 'true' ||
      params.userAbsent === '1' ||
      params.userAbsent === 'yes';
    if (absent) {
      qb.andWhere('a.userId IS NULL');
    } else {
      const uidRaw = params.userId?.trim();
      if (uidRaw) {
        const uid = parseInt(uidRaw, 10);
        if (Number.isFinite(uid)) {
          qb.andWhere('a.userId = :userId', { userId: uid });
        }
      }
    }

    const addLike = (field: string, value: string | undefined, param: string) => {
      const t = value?.trim();
      if (!t) return;
      qb.andWhere(`LOWER(${field}) LIKE :${param}`, { [param]: `%${t.toLowerCase()}%` });
    };

    addLike('a.action', params.action, 'pAction');
    addLike('a.entity', params.entity, 'pEntity');
    addLike('a.entityId', params.entityId, 'pEntityId');
    addLike('a.ipAddress', params.ipAddress, 'pIp');
    addLike('a.deviceId', params.deviceId, 'pDevId');
    addLike('a.deviceName', params.deviceName, 'pDevName');
    addLike('a.userAgent', params.userAgent, 'pUa');

    const cf = params.createdFrom?.trim();
    if (cf) {
      const d = new Date(cf);
      if (!Number.isNaN(d.getTime())) {
        qb.andWhere('a.createdAt >= :createdFrom', { createdFrom: d });
      }
    }
    const ct = params.createdTo?.trim();
    if (ct) {
      const d = new Date(ct);
      if (!Number.isNaN(d.getTime())) {
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        qb.andWhere('a.createdAt <= :createdTo', { createdTo: end });
      }
    }

    const q = params.q?.trim();
    if (q) {
      const ql = `%${q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(a.action) LIKE :qAll', { qAll: ql })
            .orWhere('LOWER(a.entity) LIKE :qAll')
            .orWhere('LOWER(a.entityId) LIKE :qAll')
            .orWhere('LOWER(COALESCE(a.ipAddress, \'\')) LIKE :qAll')
            .orWhere('LOWER(COALESCE(a.deviceId, \'\')) LIKE :qAll')
            .orWhere('LOWER(COALESCE(a.deviceName, \'\')) LIKE :qAll')
            .orWhere('LOWER(COALESCE(a.userAgent, \'\')) LIKE :qAll')
            .orWhere('LOWER(COALESCE(u.email, \'\')) LIKE :qAll')
            .orWhere('LOWER(COALESCE(u.name, \'\')) LIKE :qAll')
            .orWhere('a.metadata IS NOT NULL AND CAST(a.metadata AS CHAR) LIKE :qMeta', {
              qMeta: `%${q}%`,
            });
        }),
      );
    }

    const total = await qb.getCount();

    const rows = await qb.skip(skip).take(limit).getMany();

    const data = rows.map((a) => this.serializeLogRow(a));
    return toPaginated(data, total, page, limit);
  }

  private serializeLogRow(a: AuditLogEntity): Record<string, unknown> {
    const user = a.user;
    return {
      id: a.id,
      userId: a.userId,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        : null,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      metadata: a.metadata,
      ipAddress: a.ipAddress,
      deviceId: a.deviceId,
      deviceName: a.deviceName,
      userAgent: a.userAgent,
      createdAt: a.createdAt.toISOString(),
    };
  }

  async log(params: {
    userId: number | null;
    action: string;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
    ctx?: RequestContext | null;
  }) {
    const row = this.auditRepo.create({
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
      ipAddress: params.ctx?.ipAddress ?? null,
      deviceId: params.ctx?.deviceId ?? null,
      deviceName: params.ctx?.deviceName ?? null,
      userAgent: params.ctx?.userAgent ?? null,
    });
    await this.auditRepo.save(row);
  }
}

