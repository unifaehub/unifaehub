import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Not, Repository } from 'typeorm';
import type { RequestContext } from '../../common/http/request-context';
import { ConsentTermEntity } from '../../database/entities/consent-term.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { UserConsentAcceptanceEntity } from '../../database/entities/user-consent-acceptance.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { AuditService } from '../audit/audit.service';
import { CreateConsentTermDto } from './dto/create-consent-term.dto';
import { PatchConsentTermDto } from './dto/patch-consent-term.dto';

export type ConsentRequiredPayload = {
  consentTermId: number;
  courseId: number;
  version: string;
  title: string | null;
  content: string;
};

@Injectable()
export class ConsentTermsService {
  constructor(
    @InjectRepository(ConsentTermEntity)
    private readonly terms: Repository<ConsentTermEntity>,
    @InjectRepository(UserConsentAcceptanceEntity)
    private readonly acceptances: Repository<UserConsentAcceptanceEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    private readonly audit: AuditService,
  ) {}

  private assertActorCourse(actor: UserEntity, courseId: number) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role !== UserRole.COORDINATOR) {
      throw new ForbiddenException('Sem permissão para gerir termos deste curso.');
    }
    if (actor.courseId == null || actor.courseId !== courseId) {
      throw new ForbiddenException('Fora do curso do seu usuário.');
    }
  }

  private userBrief(u: UserEntity | null | undefined) {
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email };
  }

  private async loadCourseOrThrow(courseId: number): Promise<CourseEntity> {
    const c = await this.courses.findOne({ where: { id: courseId } });
    if (!c) throw new NotFoundException('Curso não encontrado.');
    if (c.appId == null) {
      throw new BadRequestException('Curso sem app vinculado não pode ter termos de consentimento.');
    }
    return c;
  }

  async listForCourse(actor: UserEntity, courseId: number) {
    this.assertActorCourse(actor, courseId);
    await this.loadCourseOrThrow(courseId);
    const rows = await this.terms.find({
      where: { courseId },
      order: { id: 'DESC' },
      relations: { createdBy: true, updatedBy: true },
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      version: t.version,
      active: t.active,
      courseId: t.courseId,
      appId: t.appId,
      createdAt: t.createdAt.toISOString(),
      createdBy: this.userBrief(t.createdBy),
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
      updatedBy: this.userBrief(t.updatedBy),
      contentPreview: t.content.length > 200 ? `${t.content.slice(0, 200)}…` : t.content,
    }));
  }

  async getOneForAdmin(actor: UserEntity, courseId: number, termId: number) {
    this.assertActorCourse(actor, courseId);
    const t = await this.terms.findOne({
      where: { id: termId, courseId },
      relations: { createdBy: true, updatedBy: true },
    });
    if (!t) throw new NotFoundException('Termo não encontrado.');
    return {
      id: t.id,
      title: t.title,
      version: t.version,
      content: t.content,
      active: t.active,
      courseId: t.courseId,
      appId: t.appId,
      createdAt: t.createdAt.toISOString(),
      createdBy: this.userBrief(t.createdBy),
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
      updatedBy: this.userBrief(t.updatedBy),
    };
  }

  private async deactivateOthersInCourse(
    courseId: number,
    exceptId: number | undefined,
    touchedByUserId: number,
  ) {
    const now = new Date();
    const qb = this.terms
      .createQueryBuilder()
      .update(ConsentTermEntity)
      .set({
        active: false,
        updatedById: touchedByUserId,
        updatedAt: now,
      })
      .where('course_id = :cid', { cid: courseId })
      .andWhere('active = :a', { a: true });
    if (exceptId != null) {
      qb.andWhere('id != :eid', { eid: exceptId });
    }
    await qb.execute();
  }

  /** Próxima versão no formato 0.1, 0.2… a partir das existentes no curso que seguem o padrão `0.N`. */
  private async nextConsentVersion(courseId: number): Promise<string> {
    const rows = await this.terms.find({
      where: { courseId },
      select: { version: true },
    });
    const re = /^0\.(\d+)$/;
    let max = 0;
    let found = false;
    for (const row of rows) {
      const m = row.version.match(re);
      if (m) {
        found = true;
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }
    if (!found) return '0.1';
    return `0.${max + 1}`;
  }

  async create(actor: UserEntity, courseId: number, dto: CreateConsentTermDto, ctx: RequestContext | null) {
    this.assertActorCourse(actor, courseId);
    const course = await this.loadCourseOrThrow(courseId);
    const appId = course.appId;
    if (appId == null) {
      throw new BadRequestException('Curso sem app vinculado não pode ter termos de consentimento.');
    }
    const existingCount = await this.terms.count({ where: { courseId } });
    const isFirstTerm = existingCount === 0;
    const wantActive = isFirstTerm || dto.active === true;
    if (wantActive) {
      await this.deactivateOthersInCourse(courseId, undefined, actor.id);
    }
    const version = await this.nextConsentVersion(courseId);
    const now = new Date();
    const row = this.terms.create({
      title: dto.title?.trim() ? dto.title.trim() : null,
      content: dto.content,
      version,
      active: wantActive,
      createdById: actor.id,
      updatedById: actor.id,
      updatedAt: now,
      courseId,
      appId,
    });
    const saved = await this.terms.save(row);
    await this.audit.log({
      userId: actor.id,
      action: 'CONSENT_TERM_CREATE',
      entity: 'consent_term',
      entityId: String(saved.id),
      metadata: { courseId, version: saved.version, active: saved.active },
      ctx,
    });
    return this.getOneForAdmin(actor, courseId, saved.id);
  }

  async patch(
    actor: UserEntity,
    courseId: number,
    termId: number,
    dto: PatchConsentTermDto,
    ctx: RequestContext | null,
  ) {
    this.assertActorCourse(actor, courseId);
    const t = await this.terms.findOne({ where: { id: termId, courseId } });
    if (!t) throw new NotFoundException('Termo não encontrado.');
    if (dto.title !== undefined) {
      t.title = dto.title?.trim() ? dto.title.trim() : null;
    }
    if (dto.content !== undefined) {
      if (t.active) {
        throw new BadRequestException(
          'Desative o termo antes de alterar o texto. Crie uma nova versão e ative-a.',
        );
      }
      t.content = dto.content;
    }
    if (dto.version !== undefined) {
      if (t.active) {
        throw new BadRequestException('Desative o termo antes de alterar a versão.');
      }
      const trimmed = dto.version.trim();
      const dup = await this.terms.findOne({
        where: { courseId, version: trimmed, id: Not(termId) },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException('Já existe um termo com esta versão neste curso.');
      }
      t.version = trimmed;
    }
    if (dto.active === true) {
      await this.deactivateOthersInCourse(courseId, t.id, actor.id);
      t.active = true;
    } else if (dto.active === false) {
      if (t.active) {
        const siblings = await this.terms.count({
          where: { courseId, id: Not(termId) },
        });
        if (siblings === 0) {
          throw new BadRequestException(
            'É obrigatório manter pelo menos um termo ativo. Cadastre outra versão antes de desativar esta.',
          );
        }
        throw new BadRequestException(
          'É obrigatório manter pelo menos um termo ativo. Ative outra versão na lista para substituir a atual.',
        );
      }
      t.active = false;
    }
    t.updatedById = actor.id;
    t.updatedAt = new Date();
    await this.terms.save(t);
    await this.audit.log({
      userId: actor.id,
      action: 'CONSENT_TERM_UPDATE',
      entity: 'consent_term',
      entityId: String(t.id),
      metadata: { courseId, patch: { ...dto } },
      ctx,
    });
    return this.getOneForAdmin(actor, courseId, t.id);
  }

  /** Usuários com curso precisam aceitar o termo ativo desse curso (se existir). */
  async getPendingConsent(user: UserEntity): Promise<ConsentRequiredPayload | null> {
    if (user.courseId == null) return null;
    const term = await this.terms.findOne({
      where: { courseId: user.courseId, active: true },
    });
    if (!term?.courseId) return null;
    const prior = await this.acceptances.findOne({
      where: { userId: user.id, consentTermId: term.id },
      select: { id: true },
    });
    if (prior) return null;
    return {
      consentTermId: term.id,
      courseId: term.courseId,
      version: term.version,
      title: term.title,
      content: term.content,
    };
  }

  async acceptConsent(
    user: UserEntity,
    consentTermId: number,
    ctx: RequestContext | null,
  ): Promise<{ message: string }> {
    if (user.courseId == null) {
      throw new BadRequestException('Seu usuário não está vinculado a um curso.');
    }
    const term = await this.terms.findOne({ where: { id: consentTermId } });
    if (!term || !term.active) {
      throw new BadRequestException('Termo inválido ou não está mais ativo.');
    }
    if (term.courseId == null) {
      throw new BadRequestException('Termo sem curso vinculado; contate a coordenação.');
    }
    if (term.courseId !== user.courseId) {
      throw new ForbiddenException('Este termo não se aplica ao seu curso.');
    }
    const course = await this.courses.findOne({ where: { id: term.courseId } });
    if (!course) throw new NotFoundException('Curso não encontrado.');
    if (user.appId != null && course.appId != null && user.appId !== course.appId) {
      throw new ForbiddenException('Incompatibilidade entre app do usuário e do termo.');
    }
    const dup = await this.acceptances.findOne({
      where: { userId: user.id, consentTermId: term.id },
      select: { id: true },
    });
    if (dup) {
      return { message: 'Consentimento já registrado para este termo.' };
    }
    const contentHash = createHash('sha256').update(term.content, 'utf8').digest('hex');
    await this.acceptances.save(
      this.acceptances.create({
        userId: user.id,
        consentTermId: term.id,
        courseId: term.courseId,
        ipAddress: ctx?.ipAddress ?? null,
        userAgent: ctx?.userAgent ?? null,
        deviceId: ctx?.deviceId ?? null,
        deviceName: ctx?.deviceName ?? null,
        contentHash,
      }),
    );
    await this.audit.log({
      userId: user.id,
      action: 'CONSENT_ACCEPT',
      entity: 'consent_term',
      entityId: String(term.id),
      metadata: { courseId: term.courseId, version: term.version },
      ctx,
    });
    return { message: 'Consentimento registrado com sucesso.' };
  }
}
