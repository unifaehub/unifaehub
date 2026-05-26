import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, toPaginated } from '../../common/pagination';
import { AppEntity } from '../../database/entities/app.entity';
import { ClinicalCaseEntity } from '../../database/entities/clinical-case.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { CreateClinicalCaseDto } from './dto/create-clinical-case.dto';
import { UpdateClinicalCaseDto } from './dto/update-clinical-case.dto';

@Injectable()
export class ClinicalCasesService {
  constructor(
    @InjectRepository(ClinicalCaseEntity)
    private readonly cases: Repository<ClinicalCaseEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
  ) {}

  private assertListAccess(
    actor: UserEntity,
    courseId: number | undefined,
    appId: number | undefined,
  ): void {
    if (actor.role === UserRole.ADMIN || actor.role === UserRole.COORDINATOR) return;
    if (actor.role !== UserRole.PROFESSOR && actor.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Sem permissão para listar casos clínicos.');
    }
    if (courseId == null || appId == null) {
      throw new BadRequestException('Informe courseId e appId para listar casos clínicos.');
    }
    if (actor.appId != null && actor.appId !== appId) {
      throw new ForbiddenException('Fora do aplicativo do seu usuário.');
    }
    if (actor.courseId != null && actor.courseId !== courseId) {
      throw new ForbiddenException('Fora do curso do seu usuário.');
    }
  }

  async list(
    actor: UserEntity,
    filters: {
      courseId?: number;
      appId?: number;
      page: number;
      limit: number;
      q?: string;
    },
  ): Promise<PaginatedResult<ClinicalCaseEntity>> {
    this.assertListAccess(actor, filters.courseId, filters.appId);
    const { page, limit, q } = filters;
    const skip = (page - 1) * limit;
    const qb = this.cases.createQueryBuilder('c');
    if (filters.courseId != null) {
      qb.andWhere('c.courseId = :courseId', { courseId: filters.courseId });
    }
    if (filters.appId != null) {
      qb.andWhere('c.appId = :appId', { appId: filters.appId });
    }
    const qt = q?.trim();
    if (qt) {
      qb.andWhere(
        '(LOWER(c.name) LIKE :qt OR LOWER(COALESCE(c.description, \'\')) LIKE :qt)',
        { qt: `%${qt.toLowerCase()}%` },
      );
    }
    const total = await qb.getCount();
    const rows = await qb.orderBy('c.name', 'ASC').addOrderBy('c.id', 'ASC').skip(skip).take(limit).getMany();
    return toPaginated(rows, total, page, limit);
  }

  async get(id: number): Promise<ClinicalCaseEntity> {
    const row = await this.cases.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Caso não encontrado.');
    return row;
  }

  async create(dto: CreateClinicalCaseDto): Promise<ClinicalCaseEntity> {
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException('Curso inválido.');
    const app = await this.apps.findOne({ where: { id: dto.appId } });
    if (!app) throw new BadRequestException('App inválido.');
    const row = this.cases.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      courseId: dto.courseId,
      appId: dto.appId,
    });
    return this.cases.save(row);
  }

  async update(id: number, dto: UpdateClinicalCaseDto): Promise<ClinicalCaseEntity> {
    const row = await this.get(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) row.description = dto.description?.trim() || null;
    return this.cases.save(row);
  }

  async remove(id: number): Promise<{ ok: true }> {
    await this.get(id);
    const n = await this.categories.count({ where: { clinicalCaseId: id } });
    if (n > 0) {
      throw new BadRequestException('Remova ou mova as categorias deste caso antes de excluí-lo.');
    }
    await this.cases.delete({ id });
    return { ok: true };
  }
}
