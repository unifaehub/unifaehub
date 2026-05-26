import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CourseMenuNodeEntity } from '../../database/entities/course-menu-node.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { MenuNodeEntity } from '../../database/entities/menu-node.entity';
import { CreateMenuNodeDto } from './dto/create-menu-node.dto';
import { ReplaceCourseMenuLinksDto } from './dto/replace-course-menu-links.dto';
import { UpdateMenuNodeDto } from './dto/update-menu-node.dto';

@Injectable()
export class AdminMenusService {
  constructor(
    @InjectRepository(MenuNodeEntity)
    private readonly menuNodes: Repository<MenuNodeEntity>,
    @InjectRepository(CourseMenuNodeEntity)
    private readonly courseMenuNodes: Repository<CourseMenuNodeEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listCatalog(): Promise<MenuNodeEntity[]> {
    return this.menuNodes.find({ order: { id: 'ASC' } });
  }

  async getNode(id: number): Promise<MenuNodeEntity> {
    const row = await this.menuNodes.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Nó não encontrado.');
    return row;
  }

  async createNode(dto: CreateMenuNodeDto): Promise<MenuNodeEntity> {
    const dup = await this.menuNodes.findOne({ where: { key: dto.key.trim() } });
    if (dup) throw new BadRequestException('Já existe um nó com esta chave.');
    let parentId: number | null = dto.parentId ?? null;
    if (parentId != null) {
      const p = await this.menuNodes.findOne({ where: { id: parentId } });
      if (!p) throw new BadRequestException('parentId inválido.');
    }
    const row = this.menuNodes.create({
      parentId,
      key: dto.key.trim(),
      label: dto.label.trim(),
      icon: dto.icon?.trim() || null,
      routeName: dto.routeName?.trim() || null,
      includeInNewCourses: dto.includeInNewCourses ?? true,
    });
    return this.menuNodes.save(row);
  }

  async updateNode(id: number, dto: UpdateMenuNodeDto): Promise<MenuNodeEntity> {
    const row = await this.getNode(id);
    if (dto.key !== undefined) {
      const k = dto.key.trim();
      const dup = await this.menuNodes.findOne({ where: { key: k } });
      if (dup && dup.id !== id) throw new BadRequestException('Já existe um nó com esta chave.');
      row.key = k;
    }
    if (dto.label !== undefined) row.label = dto.label.trim();
    if (dto.icon !== undefined) row.icon = dto.icon?.trim() || null;
    if (dto.routeName !== undefined) row.routeName = dto.routeName?.trim() || null;
    if (dto.includeInNewCourses !== undefined) row.includeInNewCourses = dto.includeInNewCourses;
    if (dto.parentId !== undefined) {
      const next = dto.parentId;
      if (next === null) {
        row.parentId = null;
      } else {
        if (next === id) throw new BadRequestException('O nó não pode ser pai de si mesmo.');
        const p = await this.menuNodes.findOne({ where: { id: next } });
        if (!p) throw new BadRequestException('parentId inválido.');
        if (await this.isDescendantOf(id, next)) {
          throw new BadRequestException('Não é permitido criar ciclo na hierarquia.');
        }
        row.parentId = next;
      }
    }
    return this.menuNodes.save(row);
  }

  private async isDescendantOf(ancestorId: number, maybeDescendantId: number): Promise<boolean> {
    let cur: number | null = maybeDescendantId;
    const seen = new Set<number>();
    while (cur != null) {
      if (cur === ancestorId) return true;
      if (seen.has(cur)) break;
      seen.add(cur);
      const n = await this.menuNodes.findOne({ where: { id: cur } });
      cur = n?.parentId ?? null;
    }
    return false;
  }

  async deleteNode(id: number): Promise<{ ok: true }> {
    const children = await this.menuNodes.count({ where: { parentId: id } });
    if (children > 0) {
      throw new BadRequestException('Remova ou mova os subitens antes de excluir este nó.');
    }
    const row = await this.menuNodes.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Nó não encontrado.');
    await this.menuNodes.remove(row);
    return { ok: true };
  }

  async getCourseMenuState(courseId: number) {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Curso não encontrado.');
    const catalog = await this.menuNodes.find({ order: { id: 'ASC' } });
    /** Inner join evita 500 se existir linha órfã em `course_menu_nodes` (nó apagado sem CASCADE, etc.). */
    const links = await this.courseMenuNodes
      .createQueryBuilder('cmn')
      .innerJoinAndSelect('cmn.menuNode', 'mn')
      .where('cmn.courseId = :courseId', { courseId })
      .orderBy('cmn.sortOrder', 'ASC')
      .addOrderBy('cmn.id', 'ASC')
      .getMany();
    return {
      course: { id: course.id, name: course.name, active: course.active },
      catalog: catalog.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        key: n.key,
        label: n.label,
        icon: n.icon,
        routeName: n.routeName,
        includeInNewCourses: n.includeInNewCourses,
      })),
      links: links.map((l) => ({
        id: l.id,
        menuNodeId: l.menuNodeId,
        enabled: l.enabled,
        sortOrder: l.sortOrder,
        key: l.menuNode.key,
        label: l.menuNode.label,
      })),
    };
  }

  async replaceCourseMenuLinks(courseId: number, dto: ReplaceCourseMenuLinksDto): Promise<{ ok: true }> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Curso não encontrado.');
    const ids = [...new Set(dto.items.map((i) => i.menuNodeId))];
    if (ids.length !== dto.items.length) {
      throw new BadRequestException('Itens duplicados para o mesmo menuNodeId.');
    }
    const nodes = ids.length > 0 ? await this.menuNodes.find({ where: { id: In(ids) } }) : [];
    if (nodes.length !== ids.length) {
      throw new BadRequestException('Um ou mais menuNodeId são inválidos.');
    }
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const enabledById = new Map(dto.items.filter((i) => i.enabled).map((i) => [i.menuNodeId, true]));

    for (const it of dto.items) {
      if (!it.enabled) continue;
      const n = nodeById.get(it.menuNodeId);
      if (!n?.parentId) continue;
      if (!enabledById.has(n.parentId)) {
        throw new BadRequestException(
          `Ative o item pai no menu antes de ativar "${n.label}" (hierarquia: filho depende do pai).`,
        );
      }
    }

    const sortByNormalized = this.normalizeCourseMenuSortOrders(dto.items, nodeById);

    await this.dataSource.transaction(async (em) => {
      await em.delete(CourseMenuNodeEntity, { courseId });
      const repo = em.getRepository(CourseMenuNodeEntity);
      for (const it of dto.items) {
        const sortOrder = sortByNormalized.get(it.menuNodeId) ?? it.sortOrder;
        await repo.save(
          repo.create({
            courseId,
            menuNodeId: it.menuNodeId,
            enabled: it.enabled,
            sortOrder,
          }),
        );
      }
    });
    return { ok: true };
  }

  /**
   * Raízes em dezenas (10, 20, 30…); filhos em pré-ordem logo após o pai (31, 32…).
   * Entre subárvores de raiz, avança para a próxima dezena livre.
   */
  private normalizeCourseMenuSortOrders(
    items: Array<{ menuNodeId: number; enabled: boolean; sortOrder: number }>,
    nodeById: Map<number, MenuNodeEntity>,
  ): Map<number, number> {
    const hint = new Map(items.map((i) => [i.menuNodeId, i.sortOrder]));
    const enabledIds = new Set(items.filter((i) => i.enabled).map((i) => i.menuNodeId));
    const out = new Map<number, number>();
    if (enabledIds.size === 0) return out;

    const roots: number[] = [];
    for (const id of enabledIds) {
      const n = nodeById.get(id);
      if (!n) continue;
      const pid = n.parentId;
      if (pid == null || !enabledIds.has(pid)) roots.push(id);
    }
    roots.sort((a, b) => (hint.get(a) ?? 0) - (hint.get(b) ?? 0));

    const sortedChildren = (parentId: number): number[] => {
      const ch: number[] = [];
      for (const id of enabledIds) {
        if (nodeById.get(id)?.parentId === parentId) ch.push(id);
      }
      ch.sort((a, b) => (hint.get(a) ?? 0) - (hint.get(b) ?? 0));
      return ch;
    };

    let counter = 10;
    const walk = (id: number): void => {
      out.set(id, counter);
      counter++;
      for (const ch of sortedChildren(id)) walk(ch);
    };

    for (const r of roots) {
      walk(r);
      counter = Math.ceil(counter / 10) * 10;
    }

    return out;
  }
}
