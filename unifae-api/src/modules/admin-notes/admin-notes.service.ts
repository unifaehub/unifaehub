import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminNoteEntity, AdminNoteStatus } from '../../database/entities/admin-note.entity';
import { UserRole } from '../../database/entities/enums';
import type { UserEntity } from '../../database/entities/user.entity';

@Injectable()
export class AdminNotesService {
  constructor(
    @InjectRepository(AdminNoteEntity)
    private readonly notes: Repository<AdminNoteEntity>,
  ) {}

  async list(
    actor: UserEntity,
    params: { active?: 'active' | 'inactive' | 'all'; status?: AdminNoteStatus; requestedBy?: string },
  ) {
    const qb = this.notes
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.createdByUser', 'createdByUser')
      .leftJoinAndSelect('n.updatedByUser', 'updatedByUser')
      .leftJoinAndSelect('n.approvedByUser', 'approvedByUser')
      .leftJoinAndSelect('n.rejectedByUser', 'rejectedByUser')
      .orderBy('n.createdAt', 'DESC');

    // Coordenador vê apenas as notas dele
    if (actor.role === UserRole.COORDINATOR) {
      qb.andWhere('n.createdByUserId = :uid', { uid: actor.id });
    }

    const active = params.active ?? 'active';
    if (active === 'active') qb.andWhere('n.active = true');
    if (active === 'inactive') qb.andWhere('n.active = false');

    if (params.status) qb.andWhere('n.status = :status', { status: params.status });

    if (params.requestedBy) {
      qb.andWhere('LOWER(n.requestedBy) LIKE LOWER(:rb)', { rb: `%${params.requestedBy}%` });
    }

    return qb.getMany();
  }

  async create(params: {
    description: string;
    requestedBy?: string | null;
    observations?: string | null;
    status?: AdminNoteStatus;
    createdByUserId: number;
  }) {
    const now = new Date();
    const status = params.status ?? AdminNoteStatus.OPEN;
    const row = this.notes.create({
      description: params.description,
      requestedBy: params.requestedBy ?? null,
      observations: params.observations ?? null,
      status,
      active: true,
      createdByUserId: params.createdByUserId,
      updatedByUserId: null,
      finishedAt: status === AdminNoteStatus.DONE || status === AdminNoteStatus.REJECTED ? now : null,
    });
    return this.notes.save(row);
  }

  async update(
    id: number,
    params: {
      description?: string;
      requestedBy?: string | null;
      observations?: string | null;
      status?: AdminNoteStatus;
      active?: boolean;
      rejectionReason?: string | null;
      finishedAt?: string | null;
      updatedByUserId: number;
      actor: UserEntity;
    },
  ) {
    const row = await this.notes.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Nota não encontrada.');

    // Coordenador só edita a própria nota
    if (params.actor.role === UserRole.COORDINATOR && row.createdByUserId !== params.actor.id) {
      throw new ForbiddenException('Sem permissão para alterar esta nota.');
    }

    // Regras de aprovação/reprovação (ADMIN)
    const isAdmin = params.actor.role === UserRole.ADMIN;

    if (params.description !== undefined) row.description = params.description;
    if (params.requestedBy !== undefined) row.requestedBy = params.requestedBy;
    if (params.observations !== undefined) row.observations = params.observations;
    if (params.status !== undefined) {
      row.status = params.status;
      // Qualquer status diferente de OPEN implica que houve decisão/andamento (marca aprovado se ainda não tiver)
      if (
        isAdmin &&
        row.status !== AdminNoteStatus.OPEN &&
        row.status !== AdminNoteStatus.REJECTED &&
        !row.approvedAt
      ) {
        row.approvedAt = new Date();
        row.approvedByUserId = params.actor.id;
        row.rejectionReason = null;
      }
      if (row.status === AdminNoteStatus.REJECTED) {
        if (!isAdmin) throw new ForbiddenException('Apenas ADMIN pode rejeitar notas.');
        row.rejectionReason = params.rejectionReason ?? row.rejectionReason ?? 'Rejeitado.';
        row.rejectedAt = row.rejectedAt ?? new Date();
        row.rejectedByUserId = params.actor.id;
      }
    }
    if (params.active !== undefined) row.active = params.active;
    row.updatedByUserId = params.updatedByUserId;

    if (row.status === AdminNoteStatus.DONE || row.status === AdminNoteStatus.REJECTED) {
      if (params.finishedAt !== undefined) {
        row.finishedAt = params.finishedAt ? new Date(params.finishedAt) : new Date();
      } else {
        row.finishedAt = row.finishedAt ?? new Date();
      }
    } else {
      row.finishedAt = null;
    }

    await this.notes.save(row);
    const updated = await this.notes.findOne({
      where: { id },
      relations: ['createdByUser', 'updatedByUser', 'approvedByUser', 'rejectedByUser'],
    });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  async deactivate(id: number, actor: UserEntity) {
    const row = await this.notes.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Nota não encontrada.');
    if (actor.role === UserRole.COORDINATOR && row.createdByUserId !== actor.id) {
      throw new ForbiddenException('Sem permissão para desativar esta nota.');
    }
    row.active = false;
    row.updatedByUserId = actor.id;
    await this.notes.save(row);
    return { ok: true };
  }

  async requesters() {
    const raw = await this.notes
      .createQueryBuilder('n')
      .select('DISTINCT n.requestedBy', 'requestedBy')
      .where('n.requestedBy IS NOT NULL')
      .orderBy('requestedBy', 'ASC')
      .getRawMany<{ requestedBy: string }>();
    return raw.map((r) => r.requestedBy).filter(Boolean);
  }
}

