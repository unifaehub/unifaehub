import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../database/entities/category.entity';
import { CategoryTypeDefinitionEntity } from '../../database/entities/category-type-definition.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { CreateCategoryTypeDto } from './dto/create-category-type.dto';
import { UpdateCategoryTypeDto } from './dto/update-category-type.dto';

@Injectable()
export class CategoryTypesService {
  constructor(
    @InjectRepository(CategoryTypeDefinitionEntity)
    private readonly defs: Repository<CategoryTypeDefinitionEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
  ) {}

  async listByCourse(courseId: number): Promise<CategoryTypeDefinitionEntity[]> {
    const c = await this.courses.findOne({ where: { id: courseId } });
    if (!c) throw new NotFoundException('Curso não encontrado.');
    return this.defs.find({
      where: { courseId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async create(dto: CreateCategoryTypeDto): Promise<CategoryTypeDefinitionEntity> {
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException('Curso inválido.');
    const key = dto.key.trim();
    const dup = await this.defs.findOne({ where: { courseId: dto.courseId, key } });
    if (dup) throw new BadRequestException('Já existe um tipo com esta chave neste curso.');
    const row = this.defs.create({
      courseId: dto.courseId,
      key,
      label: dto.label.trim(),
      description: dto.description?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.defs.save(row);
  }

  async update(id: number, dto: UpdateCategoryTypeDto): Promise<CategoryTypeDefinitionEntity> {
    const row = await this.defs.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Tipo não encontrado.');
    if (dto.key !== undefined) {
      const key = dto.key.trim();
      const dup = await this.defs.findOne({
        where: { courseId: row.courseId, key },
      });
      if (dup && dup.id !== id) throw new BadRequestException('Já existe um tipo com esta chave neste curso.');
      row.key = key;
    }
    if (dto.label !== undefined) row.label = dto.label.trim();
    if (dto.description !== undefined) row.description = dto.description?.trim() || null;
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    return this.defs.save(row);
  }

  async remove(id: number): Promise<{ ok: true }> {
    const row = await this.defs.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Tipo não encontrado.');
    const n = await this.categories.count({ where: { categoryTypeDefinitionId: id } });
    if (n > 0) {
      throw new BadRequestException('Existem categorias usando este tipo. Reatribua ou remova-as antes.');
    }
    await this.defs.remove(row);
    return { ok: true };
  }
}
