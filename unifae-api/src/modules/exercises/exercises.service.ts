import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '../../common/pagination';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { mkdir, readdir, rm, unlink, writeFile } from 'fs/promises';
import { basename, extname, isAbsolute, join } from 'path';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { DataSource, In, Repository } from 'typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import {
  ExerciseAttachmentEntity,
  ExerciseAttachmentKind,
} from '../../database/entities/exercise-attachment.entity';
import { ExerciseCategoryEntity } from '../../database/entities/exercise-category.entity';
import { ExerciseEntity } from '../../database/entities/exercise.entity';
import { PrescriptionItemEntity } from '../../database/entities/prescription-item.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

const ALLOWED_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export type ExerciseCategoryRef = {
  id: number;
  name: string;
  clinicalCaseId: number | null;
  clinicalCaseName: string | null;
};

export type ExerciseAttachmentRef = {
  id: number;
  kind: ExerciseAttachmentKind;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type ExerciseResponse = {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  videoUrl: string | null;
  active: boolean;
  courseId: number;
  appId: number;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  categories: ExerciseCategoryRef[];
  attachments: ExerciseAttachmentRef[];
};

function classifyKind(mime: string): ExerciseAttachmentKind {
  return mime.startsWith('video/') ? 'VIDEO_FILE' : 'DOCUMENT';
}

function sanitizeOriginalName(name: string): string {
  const base = basename(name).replace(/[\r\n\0]/g, '').trim();
  return base.length > 200 ? base.slice(0, 200) : base || 'arquivo';
}

function safeDispositionFilename(name: string): string {
  return name.replace(/[^\w.\- ()\[\]]+/g, '_').slice(0, 120) || 'download';
}

function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
  };
  return map[mime] ?? '';
}

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(ExerciseEntity)
    private readonly exercises: Repository<ExerciseEntity>,
    @InjectRepository(ExerciseCategoryEntity)
    private readonly exerciseCategories: Repository<ExerciseCategoryEntity>,
    @InjectRepository(ExerciseAttachmentEntity)
    private readonly attachments: Repository<ExerciseAttachmentEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectRepository(PrescriptionItemEntity)
    private readonly prescriptionItems: Repository<PrescriptionItemEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  private uploadRoot(): string {
    const raw = this.config.get<string>('uploads.root') ?? 'uploads';
    return isAbsolute(raw) ? raw : join(process.cwd(), raw);
  }

  private maxUploadBytes(): number {
    const mb = this.config.get<number>('uploads.maxFileMb') ?? 50;
    return Math.max(1, mb) * 1024 * 1024;
  }

  private exerciseDir(exerciseId: number): string {
    return join(this.uploadRoot(), 'exercises', String(exerciseId));
  }

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

  private assertActorRead(actor: UserEntity, courseId: number, appId: number) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.appId != null && actor.appId !== appId) {
      throw new ForbiddenException('Fora do aplicativo do seu usuário.');
    }
    if (actor.courseId != null && actor.courseId !== courseId) {
      throw new ForbiddenException('Fora do curso do seu usuário.');
    }
  }

  private async isExerciseLeafCategory(c: CategoryEntity): Promise<boolean> {
    if (c.isLeafLevel) {
      return true;
    }
    const sub = await this.categories.count({ where: { parentId: c.id } });
    return sub === 0 && c.parentId != null;
  }

  private async validateLeafCategories(
    categoryIds: number[],
    course: CourseEntity,
    requestAppId: number,
  ): Promise<CategoryEntity[]> {
    const unique = [...new Set(categoryIds)];
    if (unique.length === 0) {
      throw new BadRequestException('Informe ao menos uma categoria final.');
    }
    const rows = await this.categories.find({ where: { id: In(unique) } });
    if (rows.length !== unique.length) {
      throw new BadRequestException('Uma ou mais categorias não foram encontradas.');
    }
    const expectedAppId = course.appId ?? requestAppId;
    for (const c of rows) {
      if (c.courseId !== course.id) {
        throw new BadRequestException('Todas as categorias devem pertencer ao mesmo curso do exercício.');
      }
      if (c.appId !== expectedAppId) {
        throw new BadRequestException('Todas as categorias devem usar o mesmo app do curso do exercício.');
      }
      if (!(await this.isExerciseLeafCategory(c))) {
        throw new BadRequestException(
          `A categoria "${c.name}" não é de nível final (sem subcategorias ou marque FINAL na árvore).`,
        );
      }
    }
    return rows;
  }

  private mapAttachments(rows: ExerciseAttachmentEntity[] | undefined): ExerciseAttachmentRef[] {
    return (rows ?? []).map((a) => ({
      id: a.id,
      kind: a.kind,
      originalFilename: a.originalFilename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    }));
  }

  private mapExercise(row: ExerciseEntity): ExerciseResponse {
    const links = row.exerciseCategories ?? [];
    const categories: ExerciseCategoryRef[] = links.flatMap((ec) => {
      const cat = ec.category;
      if (!cat) return [];
      return [
        {
          id: cat.id,
          name: cat.name,
          clinicalCaseId: cat.clinicalCaseId,
          clinicalCaseName: cat.clinicalCase?.name ?? null,
        },
      ];
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      videoUrl: row.videoUrl,
      active: row.active,
      courseId: row.courseId,
      appId: row.appId,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      categories,
      attachments: this.mapAttachments(row.attachments),
    };
  }

  async list(
    filters: { courseId: number; appId: number; q?: string; page: number; limit: number },
    actor: UserEntity,
  ): Promise<PaginatedResult<ExerciseResponse>> {
    await this.assertCourseAppMatch(filters.courseId, filters.appId);
    this.assertActorRead(actor, filters.courseId, filters.appId);

    const qb = this.exercises
      .createQueryBuilder('e')
      .where('e.courseId = :cid AND e.appId = :aid', { cid: filters.courseId, aid: filters.appId });
    const qt = filters.q?.trim();
    if (qt) {
      qb.andWhere('LOWER(e.name) LIKE :qx', { qx: `%${qt.toLowerCase()}%` });
    }

    const total = await qb.clone().getCount();
    const skip = (filters.page - 1) * filters.limit;
    const rows = await qb
      .leftJoinAndSelect('e.exerciseCategories', 'ec')
      .leftJoinAndSelect('ec.category', 'cat')
      .leftJoinAndSelect('cat.clinicalCase', 'cc')
      .leftJoinAndSelect('e.attachments', 'att')
      .orderBy('e.name', 'ASC')
      .addOrderBy('e.id', 'ASC')
      .skip(skip)
      .take(filters.limit)
      .getMany();

    return {
      data: rows.map((r) => this.mapExercise(r)),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  private async getMapped(id: number): Promise<ExerciseResponse> {
    const row = await this.exercises.findOne({
      where: { id },
      relations: {
        exerciseCategories: { category: { clinicalCase: true } },
        attachments: true,
      },
    });
    if (!row) throw new NotFoundException('Exercício não encontrado.');
    return this.mapExercise(row);
  }

  async get(id: number, actor: UserEntity): Promise<ExerciseResponse> {
    const row = await this.exercises.findOne({
      where: { id },
      relations: {
        exerciseCategories: { category: { clinicalCase: true } },
        attachments: true,
      },
    });
    if (!row) throw new NotFoundException('Exercício não encontrado.');
    this.assertActorRead(actor, row.courseId, row.appId);
    return this.mapExercise(row);
  }

  async create(dto: CreateExerciseDto, createdById: number): Promise<ExerciseResponse> {
    const course = await this.assertCourseAppMatch(dto.courseId, dto.appId);
    await this.validateLeafCategories(dto.categoryIds, course, dto.appId);
    const videoUrl = dto.videoUrl?.trim() ? dto.videoUrl.trim() : null;

    const saved = await this.dataSource.transaction(async (em) => {
      const exRepo = em.getRepository(ExerciseEntity);
      const ecRepo = em.getRepository(ExerciseCategoryEntity);
      const ex = exRepo.create({
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        instructions: dto.instructions?.trim() || null,
        videoUrl,
        courseId: dto.courseId,
        appId: dto.appId,
        active: dto.active ?? true,
        createdById,
      });
      const inserted = await exRepo.save(ex);
      for (const cid of [...new Set(dto.categoryIds)]) {
        await ecRepo.save(ecRepo.create({ exerciseId: inserted.id, categoryId: cid }));
      }
      return inserted;
    });

    return this.getMapped(saved.id);
  }

  async update(id: number, dto: UpdateExerciseDto): Promise<ExerciseResponse> {
    const row = await this.exercises.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Exercício não encontrado.');

    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) row.description = dto.description?.trim() || null;
    if (dto.instructions !== undefined) row.instructions = dto.instructions?.trim() || null;
    if (dto.videoUrl !== undefined) {
      row.videoUrl = dto.videoUrl?.trim() ? dto.videoUrl.trim() : null;
    }
    if (dto.active !== undefined) row.active = dto.active;

    if (dto.categoryIds !== undefined) {
      const course = await this.courses.findOne({ where: { id: row.courseId } });
      if (!course) throw new BadRequestException('Curso do exercício não encontrado.');
      await this.validateLeafCategories(dto.categoryIds, course, row.appId);
      await this.dataSource.transaction(async (em) => {
        const ecRepo = em.getRepository(ExerciseCategoryEntity);
        const exRepo = em.getRepository(ExerciseEntity);
        await ecRepo.delete({ exerciseId: id });
        for (const cid of [...new Set(dto.categoryIds)]) {
          await ecRepo.save(ecRepo.create({ exerciseId: id, categoryId: cid }));
        }
        await exRepo.save(row);
      });
      return this.getMapped(id);
    }

    await this.exercises.save(row);
    return this.getMapped(id);
  }

  private async unlinkExerciseFiles(exerciseId: number): Promise<void> {
    const rows = await this.attachments.find({ where: { exerciseId } });
    const dir = this.exerciseDir(exerciseId);
    for (const a of rows) {
      await unlink(join(dir, a.storedFilename)).catch(() => undefined);
    }
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }

  async remove(id: number): Promise<{ ok: true }> {
    await this.getMapped(id);
    const n = await this.prescriptionItems.count({ where: { exerciseId: id } });
    if (n > 0) {
      throw new BadRequestException(
        'Não é possível excluir: o exercício está em uso em prescrições. Inative-o ou remova das prescrições.',
      );
    }
    await this.unlinkExerciseFiles(id);
    await this.exerciseCategories.delete({ exerciseId: id });
    await this.exercises.delete({ id });
    return { ok: true };
  }

  async addAttachments(
    exerciseId: number,
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string; size: number }>,
  ): Promise<ExerciseResponse> {
    const ex = await this.exercises.findOne({ where: { id: exerciseId } });
    if (!ex) throw new NotFoundException('Exercício não encontrado.');
    if (!files?.length) {
      throw new BadRequestException('Envie ao menos um arquivo.');
    }
    const maxB = this.maxUploadBytes();
    const dir = this.exerciseDir(exerciseId);
    await mkdir(dir, { recursive: true });

    for (const f of files) {
      if (!ALLOWED_MIMES.has(f.mimetype)) {
        throw new BadRequestException(`Tipo não permitido: ${f.mimetype}`);
      }
      if (f.size > maxB) {
        throw new BadRequestException(`Arquivo excede o limite de ${Math.floor(maxB / (1024 * 1024))} MB.`);
      }
      const original = sanitizeOriginalName(f.originalname);
      const ext = extname(original) || extensionForMime(f.mimetype) || '.bin';
      const stored = `${randomUUID()}${ext}`;
      const kind = classifyKind(f.mimetype);
      await writeFile(join(dir, stored), f.buffer);
      await this.attachments.save(
        this.attachments.create({
          exerciseId,
          kind,
          originalFilename: original,
          storedFilename: stored,
          mimeType: f.mimetype,
          sizeBytes: f.size,
        }),
      );
    }

    return this.getMapped(exerciseId);
  }

  async removeAttachment(exerciseId: number, attachmentId: number): Promise<{ ok: true }> {
    const row = await this.attachments.findOne({ where: { id: attachmentId, exerciseId } });
    if (!row) throw new NotFoundException('Anexo não encontrado.');
    const full = join(this.exerciseDir(exerciseId), row.storedFilename);
    await unlink(full).catch(() => undefined);
    await this.attachments.remove(row);
    try {
      const left = await readdir(this.exerciseDir(exerciseId));
      if (left.length === 0) {
        await rm(this.exerciseDir(exerciseId), { recursive: true, force: true });
      }
    } catch {
      /* pasta já removida */
    }
    return { ok: true };
  }

  async getAttachmentReadStream(
    exerciseId: number,
    attachmentId: number,
  ): Promise<{ stream: Readable; mimeType: string; dispositionName: string }> {
    const row = await this.attachments.findOne({ where: { id: attachmentId, exerciseId } });
    if (!row) throw new NotFoundException('Anexo não encontrado.');
    const full = join(this.exerciseDir(exerciseId), row.storedFilename);
    const stream = createReadStream(full);
    return {
      stream,
      mimeType: row.mimeType,
      dispositionName: safeDispositionFilename(row.originalFilename),
    };
  }
}
