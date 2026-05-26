import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, isAbsolute, join } from 'path';
import { IsNull, Repository } from 'typeorm';
import type { RequestContext } from '../../common/http/request-context';
import { UserEntity } from '../../database/entities/user.entity';
import { UserSpecialtyEntity } from '../../database/entities/user-specialty.entity';
import { UserRole } from '../../database/entities/enums';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CoordinatorSpecialtyDto, CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type NormalizedSpecialty = {
  name: string;
  isPrimary: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(UserSpecialtyEntity)
    private readonly userSpecialties: Repository<UserSpecialtyEntity>,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private uploadRoot(): string {
    const raw = this.config.get<string>('uploads.root') ?? 'uploads';
    return isAbsolute(raw) ? raw : join(process.cwd(), raw);
  }

  private profilePhotosDir(): string {
    return join(this.uploadRoot(), 'profiles');
  }

  private profilePhotoUrl(userId: number): string {
    return `/api/v1/users/${userId}/profile/photo`;
  }

  private async removeFileIfExists(path: string) {
    await unlink(path).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }

  private normalizeSpecialties(values?: CoordinatorSpecialtyDto[]): NormalizedSpecialty[] {
    if (!values) return [];
    const seen = new Set<string>();
    const out: NormalizedSpecialty[] = [];
    let primaryAssigned = false;
    for (const value of values) {
      const name = value.name.trim().replace(/\s+/g, ' ');
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      const isPrimary = value.isPrimary === true && !primaryAssigned;
      if (isPrimary) primaryAssigned = true;
      out.push({ name, isPrimary });
    }
    if (out.length && !primaryAssigned) out[0].isPrimary = true;
    return out;
  }

  private async syncCoordinatorSpecialties(userId: number, values: CoordinatorSpecialtyDto[]) {
    await this.userSpecialties.delete({ userId });
    const specialties = this.normalizeSpecialties(values);
    if (!specialties.length) return;
    await this.userSpecialties.save(
      specialties.map((specialty, index) =>
        this.userSpecialties.create({
          userId,
          name: specialty.name,
          isPrimary: specialty.isPrimary,
          sortOrder: index,
        }),
      ),
    );
  }

  private validateActivePeriod(from?: string | null, until?: string | null) {
    if (from && until && from > until) {
      throw new BadRequestException(
        'Período inválido: a data inicial deve ser anterior ou igual à data final.',
      );
    }
  }

  private applyScope(qb: ReturnType<Repository<UserEntity>['createQueryBuilder']>, actor?: UserEntity) {
    qb.andWhere('u.deletedAt IS NULL');
    const scoped =
      actor?.role === UserRole.COORDINATOR ||
      actor?.role === UserRole.PROFESSOR ||
      actor?.role === UserRole.STUDENT;
    if (scoped) {
      if (actor!.courseId != null) qb.andWhere('u.courseId = :scopeCourseId', { scopeCourseId: actor!.courseId });
      if (actor!.appId != null) qb.andWhere('u.appId = :scopeAppId', { scopeAppId: actor!.appId });
    }
  }

  async stats(actor?: UserEntity) {
    const qb = this.users.createQueryBuilder('u');
    this.applyScope(qb, actor);
    const total = await qb.getCount();

    const activeQb = this.users.createQueryBuilder('u').andWhere('u.active = :a', { a: true });
    this.applyScope(activeQb, actor);
    const active = await activeQb.getCount();

    const rawQb = this.users
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.role');
    this.applyScope(rawQb, actor);
    const raw = await rawQb.getRawMany<{ role: string; count: string }>();
    const byRole: Record<string, number> = {};
    for (const r of raw) byRole[r.role] = Number(r.count);
    return { total, active, inactive: total - active, byRole };
  }

  async list(
    params: {
      q?: string;
      role?: string;
      courseId?: number;
      appId?: number;
      active?: boolean;
      page: number;
      limit: number;
    },
    actor?: UserEntity,
  ) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.app', 'app')
      .leftJoinAndSelect('u.course', 'course')
      .leftJoinAndSelect('u.specialties', 'specialties');

    this.applyScope(qb, actor);

    if (params.q) {
      const q = `%${params.q.toLowerCase()}%`;
      qb.andWhere('(LOWER(u.name) LIKE :q OR LOWER(u.email) LIKE :q)', { q });
    }
    if (params.role) qb.andWhere('u.role = :role', { role: params.role });
    if (params.courseId) qb.andWhere('u.courseId = :courseId', { courseId: params.courseId });
    if (params.appId) qb.andWhere('u.appId = :appId', { appId: params.appId });
    if (params.active !== undefined) qb.andWhere('u.active = :active', { active: params.active });

    const total = await qb.getCount();
    const skip = (params.page - 1) * params.limit;
    const rows = await qb
      .orderBy('u.id', 'DESC')
      .skip(skip)
      .take(params.limit)
      .getMany();

    return {
      data: rows.map((u) => this.toDto(u)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async create(dto: CreateUserDto) {
    this.validateActivePeriod(dto.activeFrom ?? null, dto.activeUntil ?? null);
    const dup = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: dto.email.trim() })
      .andWhere('u.deletedAt IS NULL')
      .getOne();
    if (dup) throw new BadRequestException('E-mail já cadastrado.');

    const hash = await bcrypt.hash(dto.password, 10);
    const row = this.users.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      password: hash,
      role: dto.role,
      appId: dto.appId ?? null,
      courseId: dto.courseId ?? null,
      active: dto.active ?? true,
      activeFrom: dto.activeFrom ?? null,
      activeUntil: dto.activeUntil ?? null,
    });
    const saved = await this.users.save(row);
    if (saved.role === UserRole.COORDINATOR && dto.coordinatorSpecialties !== undefined) {
      await this.syncCoordinatorSpecialties(saved.id, dto.coordinatorSpecialties);
    }
    const reloaded = await this.users.findOne({
      where: { id: saved.id },
      relations: ['app', 'course', 'specialties'],
    });
    return this.toDto(reloaded!);
  }

  async update(id: number, dto: UpdateUserDto, actor: UserEntity, ctx: RequestContext | null) {
    const row = await this.users.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['app', 'course'],
    });
    if (!row) throw new NotFoundException('Usuário não encontrado.');

    if (actor.role === UserRole.COORDINATOR) {
      const allowedKeys = ['active'] as const;
      const sent = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
      const onlyActive = sent.length === 1 && sent[0] === 'active';
      if (!onlyActive) {
        throw new ForbiddenException('Você só pode ativar ou desativar usuários do seu curso.');
      }
      if (row.role === UserRole.ADMIN) {
        throw new ForbiddenException('Não é permitido alterar este usuário.');
      }
      if (actor.courseId != null && row.courseId !== actor.courseId) {
        throw new ForbiddenException('Usuário fora do seu curso.');
      }
      if (actor.appId != null && row.appId !== actor.appId) {
        throw new ForbiddenException('Usuário fora do seu aplicativo.');
      }
      row.active = dto.active as boolean;
      await this.users.save(row);
      await this.audit.log({
        userId: actor.id,
        action: 'USER_SET_ACTIVE',
        entity: 'User',
        entityId: String(id),
        metadata: { active: row.active, targetEmail: row.email },
        ctx,
      });
      if (id !== actor.id) {
        void this.notifications.notifyUserAccountUpdated({
          targetUserId: id,
          actorName: actor.name,
          summary: row.active
            ? 'Sua conta foi reativada no sistema.'
            : 'Sua conta foi desativada no sistema.',
        });
      }
      const reloaded = await this.users.findOne({ where: { id }, relations: ['app', 'course', 'specialties'] });
      return reloaded ? this.toDto(reloaded) : this.toDto(row);
    }

    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Sem permissão para editar.');
    }

    const nextFrom = dto.activeFrom !== undefined ? dto.activeFrom : row.activeFrom;
    const nextUntil = dto.activeUntil !== undefined ? dto.activeUntil : row.activeUntil;
    this.validateActivePeriod(nextFrom, nextUntil);

    if (dto.email !== undefined) {
      const normalized = dto.email.trim().toLowerCase();
      const dup = await this.users
        .createQueryBuilder('u')
        .where('LOWER(u.email) = LOWER(:email)', { email: normalized })
        .andWhere('u.id != :id', { id })
        .andWhere('u.deletedAt IS NULL')
        .getOne();
      if (dup) throw new BadRequestException('E-mail já cadastrado.');
      row.email = normalized;
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.role !== undefined) row.role = dto.role;
    if (dto.appId !== undefined) row.appId = dto.appId ?? null;
    if (dto.courseId !== undefined) row.courseId = dto.courseId ?? null;
    if (dto.active !== undefined) row.active = dto.active;
    if (dto.activeFrom !== undefined) row.activeFrom = dto.activeFrom ?? null;
    if (dto.activeUntil !== undefined) row.activeUntil = dto.activeUntil ?? null;
    if (dto.password !== undefined && dto.password.length > 0) {
      row.password = await bcrypt.hash(dto.password, 10);
    }

    await this.users.save(row);
    if (row.role !== UserRole.COORDINATOR) {
      await this.syncCoordinatorSpecialties(row.id, []);
    } else if (dto.coordinatorSpecialties !== undefined) {
      await this.syncCoordinatorSpecialties(row.id, dto.coordinatorSpecialties);
    }
    await this.audit.log({
      userId: actor.id,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: String(id),
      metadata: {
        targetEmail: row.email,
        changed: Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined),
      },
      ctx,
    });

    if (id !== actor.id) {
      const bits: string[] = [];
      if (dto.active !== undefined) bits.push(dto.active ? 'conta ativa' : 'conta inativa');
      if (dto.name !== undefined) bits.push('nome');
      if (dto.email !== undefined) bits.push('e-mail');
      if (dto.role !== undefined) bits.push('perfil');
      if (dto.appId !== undefined || dto.courseId !== undefined) bits.push('aplicativo ou curso');
      if (dto.password !== undefined && dto.password.length > 0) bits.push('senha');
      if (dto.activeFrom !== undefined || dto.activeUntil !== undefined) bits.push('período de atividade');
      void this.notifications.notifyUserAccountUpdated({
        targetUserId: id,
        actorName: actor.name,
        summary: bits.length ? `Alterações na sua conta: ${bits.join(', ')}.` : '',
      });
    }

    const withRel = await this.users.findOne({
      where: { id },
      relations: ['app', 'course', 'specialties'],
    });
    return withRel ? this.toDto(withRel) : this.toDto(row);
  }

  async softDelete(id: number, actor: UserEntity, ctx: RequestContext | null) {
    if (actor.role !== UserRole.ADMIN) throw new ForbiddenException('Apenas administradores podem excluir.');
    const row = await this.users.findOne({ where: { id } });
    if (!row || row.deletedAt) throw new NotFoundException('Usuário não encontrado.');
    row.deletedAt = new Date();
    row.active = false;
    await this.users.save(row);
    await this.audit.log({
      userId: actor.id,
      action: 'USER_SOFT_DELETE',
      entity: 'User',
      entityId: String(id),
      metadata: { targetEmail: row.email, targetRole: row.role },
      ctx,
    });
    return { ok: true, id };
  }

  private canAccessUserPhoto(actor: UserEntity, target: UserEntity): boolean {
    if (actor.role === UserRole.ADMIN || actor.id === target.id) return true;
    if (actor.role === UserRole.COORDINATOR || actor.role === UserRole.PROFESSOR || actor.role === UserRole.STUDENT) {
      const sameCourse = actor.courseId == null || target.courseId === actor.courseId;
      const sameApp = actor.appId == null || target.appId === actor.appId;
      return sameCourse && sameApp;
    }
    return false;
  }

  async uploadProfilePhoto(
    id: number,
    actor: UserEntity,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Envie uma imagem válida.');

    const user = await this.users.findOne({ where: { id, deletedAt: IsNull() } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (actor.role !== UserRole.ADMIN && actor.id !== user.id) {
      throw new ForbiddenException('Sem permissão para alterar esta foto.');
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Formato inválido. Use JPG, PNG ou WEBP.');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new BadRequestException('A imagem excede 8MB.');
    }

    const ext =
      file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const filename = `u${user.id}-${Date.now()}${ext}`;
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

  async readProfilePhoto(actor: UserEntity, id: number) {
    const user = await this.users.findOne({ where: { id, deletedAt: IsNull() } });
    if (!user || !user.profilePhotoPath) {
      throw new NotFoundException('Foto de perfil não encontrada.');
    }
    if (!this.canAccessUserPhoto(actor, user)) {
      throw new ForbiddenException('Sem permissão para acessar esta foto.');
    }

    const full = join(this.uploadRoot(), user.profilePhotoPath);
    const ext = extname(user.profilePhotoPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return {
      stream: createReadStream(full),
      mimeType,
      filename: `perfil-${user.id}${ext || '.jpg'}`,
    };
  }

  private toDto(u: UserEntity) {
    const specialties = [...(u.specialties ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
    );
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      appId: u.appId,
      courseId: u.courseId,
      app: u.app ? { id: u.app.id, name: u.app.name } : null,
      course: u.course ? { id: u.course.id, name: u.course.name } : null,
      photoUrl: u.profilePhotoPath ? this.profilePhotoUrl(u.id) : null,
      primarySpecialty:
        u.role === UserRole.COORDINATOR
          ? specialties.find((s) => s.isPrimary)?.name ?? specialties[0]?.name ?? null
          : null,
      coordinatorSpecialties:
        u.role === UserRole.COORDINATOR
          ? specialties.map((s) => ({ id: s.id, name: s.name, isPrimary: s.isPrimary }))
          : [],
      active: u.active,
      activeFrom: u.activeFrom,
      activeUntil: u.activeUntil,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async importMany(items: CreateUserDto[]) {
    const created: Array<{ index: number; id: number; email: string }> = [];
    const errors: Array<{ index: number; email?: string; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const dto = items[i]!;
      try {
        const r = await this.create(dto);
        created.push({ index: i, id: r.id, email: r.email });
      } catch (e: any) {
        errors.push({
          index: i,
          email: dto.email,
          error: e?.message ? String(e.message) : 'Falha ao importar.',
        });
      }
    }
    return { created, errors };
  }
}
