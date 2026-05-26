import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseMenuNodeEntity } from '../../database/entities/course-menu-node.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { MenuNodeEntity } from '../../database/entities/menu-node.entity';

export type CourseNavigationItemDto = {
  menuNodeId: number;
  parentId: number | null;
  key: string;
  label: string;
  icon: string | null;
  routeName: string | null;
  sortOrder: number;
};

type LegacyFlat = {
  key: string;
  label?: string | null;
  enabled: boolean;
  sortOrder: number;
  icon?: string | null;
};

@Injectable()
export class MenusService implements OnModuleInit {
  constructor(
    @InjectRepository(MenuNodeEntity)
    private readonly menuNodes: Repository<MenuNodeEntity>,
    @InjectRepository(CourseMenuNodeEntity)
    private readonly courseMenuNodes: Repository<CourseMenuNodeEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
  ) {}

  async onModuleInit() {
    await this.ensureCatalogIfEmpty();
    await this.syncStandardMenuRoutes();
  }

  /**
   * Mantém o catálogo padrão alinhado: só `overview` usa rota fixa `course-hub`;
   * demais chaves conhecidas são dinâmicas (`/n/:menuNodeId`).
   */
  async syncStandardMenuRoutes(): Promise<void> {
    await this.menuNodes
      .createQueryBuilder()
      .update(MenuNodeEntity)
      .set({ routeName: null })
      .where('key IN (:...keys)', {
        keys: ['patients', 'exercises', 'prescriptions', 'approvals', 'library'],
      })
      .execute();
    await this.menuNodes
      .createQueryBuilder()
      .update(MenuNodeEntity)
      .set({ routeName: 'course-hub' })
      .where('key = :k', { k: 'overview' })
      .execute();
  }

  /** Garante catálogo mínimo para FK e para novos cursos (ambiente sem seed). */
  async ensureCatalogIfEmpty(): Promise<void> {
    if ((await this.menuNodes.count()) > 0) return;

    await this.menuNodes.save(
      this.menuNodes.create({
        parentId: null,
        key: 'overview',
        label: 'Visão geral',
        icon: 'school',
        routeName: 'course-hub',
        includeInNewCourses: true,
      }),
    );
    await this.menuNodes.save([
      this.menuNodes.create({
        parentId: null,
        key: 'patients',
        label: 'Pacientes',
        icon: 'personal_injury',
        routeName: null,
        includeInNewCourses: true,
      }),
      this.menuNodes.create({
        parentId: null,
        key: 'exercises',
        label: 'Exercícios',
        icon: 'fitness_center',
        routeName: null,
        includeInNewCourses: true,
      }),
      this.menuNodes.create({
        parentId: null,
        key: 'prescriptions',
        label: 'Prescrições',
        icon: 'medical_services',
        routeName: null,
        includeInNewCourses: true,
      }),
      this.menuNodes.create({
        parentId: null,
        key: 'approvals',
        label: 'Aprovações',
        icon: 'verified',
        routeName: null,
        includeInNewCourses: true,
      }),
      this.menuNodes.create({
        parentId: null,
        key: 'library',
        label: 'Biblioteca de arquivos',
        icon: 'folder',
        routeName: null,
        includeInNewCourses: false,
      }),
    ]);

    const exercises = await this.menuNodes.findOne({ where: { key: 'exercises' } });
    if (exercises) {
      await this.menuNodes.save(
        this.menuNodes.create({
          parentId: exercises.id,
          key: 'demo-teste',
          label: 'TESTE',
          icon: 'science',
          routeName: null,
          includeInNewCourses: false,
        }),
      );
    }
  }

  private isEduFisica(name: string) {
    const n = name.toLowerCase();
    return n.includes('educa') && (n.includes('física') || n.includes('fisica'));
  }

  private isPublicidade(name: string) {
    return name.toLowerCase().includes('publicidade');
  }

  private legacyFlatFromCourseName(name: string): LegacyFlat[] {
    if (this.isEduFisica(name)) {
      return [
        { key: 'overview', enabled: true, sortOrder: 0 },
        { key: 'exercises', enabled: true, sortOrder: 10 },
        { key: 'patients', enabled: false, sortOrder: 20 },
        { key: 'prescriptions', enabled: false, sortOrder: 30 },
        { key: 'approvals', enabled: false, sortOrder: 40 },
        { key: 'library', enabled: false, sortOrder: 50 },
      ];
    }
    const lib = this.isPublicidade(name);
    return [
      { key: 'overview', enabled: true, sortOrder: 0 },
      { key: 'patients', enabled: true, sortOrder: 10 },
      { key: 'exercises', enabled: true, sortOrder: 20 },
      { key: 'prescriptions', enabled: true, sortOrder: 30 },
      { key: 'approvals', enabled: true, sortOrder: 40 },
      { key: 'library', enabled: lib, sortOrder: 50 },
    ];
  }

  private async legacyNavFromCourse(course: CourseEntity): Promise<CourseNavigationItemDto[]> {
    let flat: LegacyFlat[] = [];
    const raw = course.navigationJson;
    if (Array.isArray(raw) && raw.length) {
      flat = raw.filter((x) => x && typeof x === 'object').map((x) => x as LegacyFlat);
    } else {
      flat = this.legacyFlatFromCourseName(course.name);
    }
    const nodes = await this.menuNodes.find({ where: { key: In(flat.map((f) => f.key)) } });
    const byKey = new Map(nodes.map((n) => [n.key, n]));
    const out: CourseNavigationItemDto[] = [];
    for (const f of flat.sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (!f.enabled) continue;
      const n = byKey.get(f.key);
      if (!n) continue;
      out.push({
        menuNodeId: n.id,
        parentId: n.parentId,
        key: n.key,
        label: (f.label && String(f.label).trim()) || n.label,
        icon: f.icon ?? n.icon,
        routeName: n.routeName,
        sortOrder: f.sortOrder,
      });
    }
    return out;
  }

  async getNavigationForCourse(courseId: number): Promise<CourseNavigationItemDto[]> {
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) return [];

    const cnt = await this.courseMenuNodes.count({ where: { courseId } });
    if (cnt === 0) {
      return this.legacyNavFromCourse(course);
    }

    const links = await this.courseMenuNodes
      .createQueryBuilder('cmn')
      .innerJoinAndSelect('cmn.menuNode', 'mn')
      .where('cmn.courseId = :courseId', { courseId })
      .andWhere('cmn.enabled = :en', { en: true })
      .orderBy('cmn.sortOrder', 'ASC')
      .addOrderBy('cmn.id', 'ASC')
      .getMany();
    const activeIds = new Set(links.map((l) => l.menuNodeId));

    const filtered = links.filter((l) => {
      const node = l.menuNode;
      if (!node) return false;
      let pid: number | null = node.parentId;
      while (pid != null) {
        if (!activeIds.has(pid)) return false;
        const parentLink = links.find((x) => x.menuNodeId === pid);
        if (!parentLink?.menuNode) return false;
        pid = parentLink.menuNode.parentId;
      }
      return true;
    });

    filtered.sort((a, b) => a.sortOrder - b.sortOrder);

    return filtered.map((l) => {
      const node = l.menuNode;
      return {
        menuNodeId: l.menuNodeId,
        parentId: node.parentId,
        key: node.key,
        label: node.label,
        icon: node.icon,
        routeName: node.routeName,
        sortOrder: l.sortOrder,
      };
    });
  }

  async assignDefaultsForNewCourse(courseId: number): Promise<void> {
    await this.ensureCatalogIfEmpty();
    const nodes = await this.menuNodes.find({
      where: { includeInNewCourses: true },
      order: { id: 'ASC' },
    });
    const orderMap: Record<string, number> = {
      overview: 0,
      patients: 10,
      exercises: 20,
      prescriptions: 30,
      approvals: 40,
      library: 50,
    };
    for (const n of nodes) {
      await this.courseMenuNodes.save(
        this.courseMenuNodes.create({
          courseId,
          menuNodeId: n.id,
          enabled: true,
          sortOrder: orderMap[n.key] ?? n.id * 10,
        }),
      );
    }
  }

  async navigationForCourseIds(courseIds: number[]): Promise<Map<number, CourseNavigationItemDto[]>> {
    const map = new Map<number, CourseNavigationItemDto[]>();
    for (const id of courseIds) {
      map.set(id, await this.getNavigationForCourse(id));
    }
    return map;
  }
}
