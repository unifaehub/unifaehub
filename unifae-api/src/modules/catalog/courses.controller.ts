import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parsePageLimit, toPaginated } from '../../common/pagination';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AppEntity } from '../../database/entities/app.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { UserRole } from '../../database/entities/enums';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { MenusService } from './menus.service';

@Controller('courses')
export class CoursesController {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    private readonly menus: MenusService,
  ) {}

  /** Cursos ativos para o menu lateral (com navegação). */
  @UseGuards(AuthGuard('jwt'))
  @Get('nav')
  async listNav() {
    const rows = await this.courses.find({
      where: { active: true },
      relations: ['app'],
      order: { name: 'ASC', id: 'ASC' },
    });
    const navMap = await this.menus.navigationForCourseIds(rows.map((r) => r.id));
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      appId: c.appId,
      app: c.app ? { id: c.app.id, name: c.app.name, active: c.app.active } : null,
      caseContextLabel: c.caseContextLabel,
      navigation: navMap.get(c.id) ?? [],
    }));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('active') active?: string,
    @Query('appId') appId?: string,
    @Query('includeNavigation') includeNavigation?: string,
  ) {
    const { page: p, limit: l, skip } = parsePageLimit(page, limit, 20, 100);
    const qb = this.courses.createQueryBuilder('c').leftJoinAndSelect('c.app', 'app');
    const qt = q?.trim();
    if (qt) {
      qb.andWhere('LOWER(c.name) LIKE :q', { q: `%${qt.toLowerCase()}%` });
    }
    if (active === 'true' || active === '1') {
      qb.andWhere('c.active = :act', { act: true });
    } else if (active === 'false' || active === '0') {
      qb.andWhere('c.active = :act', { act: false });
    }
    if (appId != null && appId !== '') {
      if (appId === '__none__' || appId === 'null') {
        qb.andWhere('c.appId IS NULL');
      } else {
        const aid = Number(appId);
        if (Number.isFinite(aid)) {
          qb.andWhere('c.appId = :aid', { aid });
        }
      }
    }
    const total = await qb.getCount();
    const rows = await qb.orderBy('c.id', 'ASC').skip(skip).take(l).getMany();

    const withNav = includeNavigation === 'true' || includeNavigation === '1';
    const navMap = withNav
      ? await this.menus.navigationForCourseIds(rows.map((r) => r.id))
      : new Map<number, unknown[]>();

    const data = rows.map((c) => ({
      ...c,
      navigation: withNav ? (navMap.get(c.id) ?? []) : [],
    }));

    return toPaginated(data, total, p, l);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/navigation')
  async navigation(@Param('id') id: string) {
    return this.menus.getNavigationForCourse(Number(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.courses.findOne({
      where: { id: Number(id) },
      relations: ['app'],
    });
    if (!row) return null;
    const navigation = await this.menus.getNavigationForCourse(row.id);
    return { ...row, navigation };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateCourseDto) {
    const row = this.courses.create({
      name: dto.name,
      appId: dto.appId ?? null,
      active: dto.active ?? true,
      caseContextLabel:
        dto.caseContextLabel === undefined
          ? null
          : dto.caseContextLabel === null || dto.caseContextLabel === ''
            ? null
            : dto.caseContextLabel.trim(),
    });
    const saved = await this.courses.save(row);
    await this.menus.assignDefaultsForNewCourse(saved.id);
    const navigation = await this.menus.getNavigationForCourse(saved.id);
    return { ...saved, navigation };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    const row = await this.courses.findOne({ where: { id: Number(id) } });
    if (!row) return null;
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.active !== undefined) row.active = dto.active;
    if (dto.appId !== undefined) row.appId = dto.appId as number | null;
    if (dto.navigationJson !== undefined) row.navigationJson = dto.navigationJson;
    if (dto.caseContextLabel !== undefined) {
      row.caseContextLabel =
        dto.caseContextLabel === null || dto.caseContextLabel === ''
          ? null
          : dto.caseContextLabel.trim();
    }
    const saved = await this.courses.save(row);

    if (saved.active === false && saved.appId != null) {
      await this.apps.update({ id: saved.appId }, { active: false });
    }

    const navigation = await this.menus.getNavigationForCourse(saved.id);
    return { ...saved, navigation };
  }
}
