import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parsePageLimit, toPaginated } from '../../common/pagination';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AppEntity } from '../../database/entities/app.entity';
import { CourseEntity } from '../../database/entities/course.entity';
import { UserRole } from '../../database/entities/enums';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';

@Controller('apps')
export class AppsController {
  constructor(
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('active') active?: string,
  ) {
    const { page: p, limit: l, skip } = parsePageLimit(page, limit, 20, 100);
    const qb = this.apps.createQueryBuilder('a');
    const qt = q?.trim();
    if (qt) {
      qb.andWhere('LOWER(a.name) LIKE :q', { q: `%${qt.toLowerCase()}%` });
    }
    if (active === 'true' || active === '1') {
      qb.andWhere('a.active = :act', { act: true });
    } else if (active === 'false' || active === '0') {
      qb.andWhere('a.active = :act', { act: false });
    }
    const total = await qb.getCount();
    const rows = await qb.orderBy('a.id', 'ASC').skip(skip).take(l).getMany();
    return toPaginated(rows, total, p, l);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateAppDto) {
    const row = this.apps.create({
      name: dto.name,
      active: dto.active ?? true,
    });
    return this.apps.save(row);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAppDto) {
    const row = await this.apps.findOne({ where: { id: Number(id) } });
    if (!row) return null;
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.active !== undefined) {
      if (dto.active === true) {
        const n = await this.courses.count({
          where: { appId: row.id, active: true },
        });
        if (n === 0) {
          throw new BadRequestException(
            'É necessário ter ao menos um curso ativo vinculado a este aplicativo antes de ativá-lo.',
          );
        }
      }
      row.active = dto.active;
    }
    return this.apps.save(row);
  }
}
