import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../database/entities/category.entity';
import { CategoryTypeDefinitionEntity } from '../../database/entities/category-type-definition.entity';
import { ClinicalCaseEntity } from '../../database/entities/clinical-case.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { ExerciseCategoryEntity } from '../../database/entities/exercise-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export type LeafCategoryListItem = {
  id: number;
  name: string;
  clinicalCaseId: number | null;
  clinicalCaseName: string | null;
  sortOrder: number;
};

@Injectable()
export class CategoriesTreeService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(ClinicalCaseEntity)
    private readonly clinicalCases: Repository<ClinicalCaseEntity>,
    @InjectRepository(CategoryTypeDefinitionEntity)
    private readonly typeDefs: Repository<CategoryTypeDefinitionEntity>,
    @InjectRepository(ExerciseCategoryEntity)
    private readonly exerciseCategories: Repository<ExerciseCategoryEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
  ) {}

  async listByCase(clinicalCaseId: number): Promise<CategoryEntity[]> {
    const c = await this.clinicalCases.findOne({ where: { id: clinicalCaseId } });
    if (!c) throw new NotFoundException('Caso não encontrado.');
    return this.categories.find({
      where: { clinicalCaseId },
      relations: { categoryTypeDefinition: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Categorias utilizáveis como destino de exercícios no curso:
   * - `isLeafLevel === true`, ou
   * - folha estrutural (sem subcategorias e com pai), para quem esqueceu de marcar "nível FINAL".
   * Usa o app do cadastro do curso como referência (evita lista vazia por divergência de app_id nas linhas).
   */
  async listLeafByCourse(appId: number, courseId: number): Promise<LeafCategoryListItem[]> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) {
      return [];
    }
    if (course.appId != null && course.appId !== appId) {
      return [];
    }
    const expectedAppId = course.appId ?? appId;

    const all = await this.categories.find({
      where: { courseId },
      relations: { clinicalCase: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const scoped = all.filter((c) => c.appId === expectedAppId);
    const hasChild = (id: number) => scoped.some((x) => x.parentId === id);
    const leaves = scoped.filter(
      (c) => c.isLeafLevel || (c.parentId != null && !hasChild(c.id)),
    );
    return leaves.map((c) => ({
      id: c.id,
      name: c.name,
      clinicalCaseId: c.clinicalCaseId,
      clinicalCaseName: c.clinicalCase?.name ?? null,
      sortOrder: c.sortOrder,
    }));
  }

  async create(dto: CreateCategoryDto): Promise<CategoryEntity> {
    const kase = await this.clinicalCases.findOne({ where: { id: dto.clinicalCaseId } });
    if (!kase) throw new BadRequestException('Caso clínico inválido.');
    const def = await this.typeDefs.findOne({ where: { id: dto.categoryTypeDefinitionId } });
    if (!def || def.courseId !== kase.courseId) {
      throw new BadRequestException('Tipo de classificação inválido para o curso deste contexto.');
    }
    let parentId: number | null = dto.parentId ?? null;
    if (parentId != null) {
      const p = await this.categories.findOne({ where: { id: parentId } });
      if (!p) throw new BadRequestException('Categoria pai inválida.');
      if (p.clinicalCaseId !== dto.clinicalCaseId) {
        throw new BadRequestException('O pai deve pertencer ao mesmo caso clínico.');
      }
      if (p.courseId !== kase.courseId || p.appId !== kase.appId) {
        throw new BadRequestException('Inconsistência curso/app entre pai e caso.');
      }
      if (p.isLeafLevel) {
        throw new BadRequestException(
          'O pai está marcado como último nível; não é possível criar subcategorias abaixo dele.',
        );
      }
    }
    const row = this.categories.create({
      name: dto.name.trim(),
      categoryTypeDefinitionId: dto.categoryTypeDefinitionId,
      courseId: kase.courseId,
      appId: kase.appId,
      clinicalCaseId: dto.clinicalCaseId,
      parentId,
      sortOrder: dto.sortOrder ?? 0,
      isLeafLevel: dto.isLeafLevel ?? false,
    });
    return this.categories.save(row);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    const row = await this.categories.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Categoria não encontrada.');
    if (row.clinicalCaseId == null) {
      throw new BadRequestException('Categoria legada sem caso: edite apenas via migração.');
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.categoryTypeDefinitionId !== undefined) {
      const def = await this.typeDefs.findOne({ where: { id: dto.categoryTypeDefinitionId } });
      if (!def || def.courseId !== row.courseId) {
        throw new BadRequestException('Tipo de classificação inválido para o curso deste contexto.');
      }
      row.categoryTypeDefinitionId = dto.categoryTypeDefinitionId;
    }
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    if (dto.isLeafLevel !== undefined) {
      if (dto.isLeafLevel) {
        const sub = await this.categories.count({ where: { parentId: id } });
        if (sub > 0) {
          throw new BadRequestException(
            'Remova as subcategorias antes de marcar este nó como último nível.',
          );
        }
      }
      row.isLeafLevel = dto.isLeafLevel;
    }
    if (dto.parentId !== undefined) {
      const next = dto.parentId;
      if (next === null) {
        row.parentId = null;
      } else {
        if (next === id) throw new BadRequestException('A categoria não pode ser pai de si mesma.');
        const p = await this.categories.findOne({ where: { id: next } });
        if (!p) throw new BadRequestException('Categoria pai inválida.');
        if (p.clinicalCaseId !== row.clinicalCaseId) {
          throw new BadRequestException('O pai deve pertencer ao mesmo caso clínico.');
        }
        if (p.isLeafLevel) {
          throw new BadRequestException(
            'Não é possível posicionar abaixo de um nó marcado como último nível.',
          );
        }
        if (await this.isDescendantOf(id, next)) {
          throw new BadRequestException('Não é permitido criar ciclo na hierarquia.');
        }
        row.parentId = next;
      }
    }
    return this.categories.save(row);
  }

  async remove(id: number): Promise<{ ok: true }> {
    const row = await this.categories.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Categoria não encontrada.');
    const children = await this.categories.count({ where: { parentId: id } });
    if (children > 0) {
      throw new BadRequestException('Remova as subcategorias antes de excluir esta categoria.');
    }
    const links = await this.exerciseCategories.count({ where: { categoryId: id } });
    if (links > 0) {
      throw new BadRequestException('Existem exercícios vinculados a esta categoria.');
    }
    await this.categories.remove(row);
    return { ok: true };
  }

  private async isDescendantOf(ancestorId: number, maybeDescendantId: number): Promise<boolean> {
    let cur: number | null = maybeDescendantId;
    const seen = new Set<number>();
    while (cur != null) {
      if (cur === ancestorId) return true;
      if (seen.has(cur)) break;
      seen.add(cur);
      const n = await this.categories.findOne({ where: { id: cur } });
      cur = n?.parentId ?? null;
    }
    return false;
  }
}
