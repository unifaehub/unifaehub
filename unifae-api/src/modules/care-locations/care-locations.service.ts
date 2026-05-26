import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CareLocationEntity,
  CourseCareLocationEntity,
  CourseEntity,
  UserEntity,
} from '../../database/entities';
import { UserRole } from '../../database/entities/enums';
import { googleMapsUrlFromAddress, toBooleanFlag } from '../../shared/google-maps.util';
import { CreateCareLocationDto } from './dto/create-care-location.dto';
import { UpdateCareLocationDto } from './dto/update-care-location.dto';

export type CareLocationRow = {
  id: number;
  appId: number;
  name: string;
  address: string;
  notes: string | null;
  active: boolean;
  mapsUrl: string | null;
  courseIds: number[];
};

@Injectable()
export class CareLocationsService {
  constructor(
    @InjectRepository(CareLocationEntity)
    private readonly locations: Repository<CareLocationEntity>,
    @InjectRepository(CourseCareLocationEntity)
    private readonly courseLinks: Repository<CourseCareLocationEntity>,
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
  ) {}

  private assertStaffRead(actor: UserEntity) {
    const ok = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT].includes(
      actor.role,
    );
    if (!ok) throw new ForbiddenException('Sem permissão.');
  }

  private assertAdmin(actor: UserEntity) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem gerenciar locais de atendimento.');
    }
  }

  private async mapRow(loc: CareLocationEntity): Promise<CareLocationRow> {
    const links = await this.courseLinks.find({ where: { careLocationId: loc.id } });
    return {
      id: loc.id,
      appId: loc.appId,
      name: loc.name,
      address: loc.address,
      notes: loc.notes,
      active: toBooleanFlag(loc.active, true),
      mapsUrl: googleMapsUrlFromAddress(loc.address),
      courseIds: links.map((l) => l.courseId),
    };
  }

  private async syncCourses(locationId: number, appId: number, courseIds: number[]) {
    const unique = [...new Set(courseIds.filter((id) => Number.isFinite(id) && id > 0))];
    if (!unique.length) {
      await this.courseLinks.delete({ careLocationId: locationId });
      return;
    }
    const valid = await this.courses.find({
      where: { id: In(unique), appId },
      select: ['id'],
    });
    if (valid.length !== unique.length) {
      throw new BadRequestException('Um ou mais cursos não pertencem ao app informado.');
    }
    await this.courseLinks.delete({ careLocationId: locationId });
    await this.courseLinks.save(
      unique.map((courseId) => this.courseLinks.create({ courseId, careLocationId: locationId })),
    );
  }

  async list(actor: UserEntity, appId: number, courseId?: number): Promise<CareLocationRow[]> {
    this.assertStaffRead(actor);
    if (!Number.isFinite(appId)) return [];

    let locationIds: number[] | null = null;
    if (courseId != null && Number.isFinite(courseId)) {
      const links = await this.courseLinks.find({ where: { courseId } });
      locationIds = links.map((l) => l.careLocationId);
      if (!locationIds.length) return [];
    }

    const rows = await this.locations.find({
      where: {
        appId,
        ...(locationIds ? { id: In(locationIds) } : {}),
      },
      order: { name: 'ASC', id: 'ASC' },
    });
    return Promise.all(rows.map((r) => this.mapRow(r)));
  }

  async get(actor: UserEntity, id: number): Promise<CareLocationRow> {
    this.assertStaffRead(actor);
    const loc = await this.locations.findOne({ where: { id } });
    if (!loc) throw new NotFoundException('Local não encontrado.');
    return this.mapRow(loc);
  }

  async create(actor: UserEntity, dto: CreateCareLocationDto): Promise<CareLocationRow> {
    this.assertAdmin(actor);
    const saved = await this.locations.save(
      this.locations.create({
        appId: dto.appId,
        name: dto.name.trim(),
        address: dto.address.trim(),
        notes: dto.notes?.trim() || null,
        active: toBooleanFlag(dto.active, true),
      }),
    );
    if (dto.courseIds?.length) {
      await this.syncCourses(saved.id, dto.appId, dto.courseIds);
    }
    return this.mapRow(saved);
  }

  async update(actor: UserEntity, id: number, dto: UpdateCareLocationDto): Promise<CareLocationRow> {
    this.assertAdmin(actor);
    const loc = await this.locations.findOne({ where: { id } });
    if (!loc) throw new NotFoundException('Local não encontrado.');

    if (dto.name != null) loc.name = dto.name.trim();
    if (dto.address != null) loc.address = dto.address.trim();
    if (dto.notes !== undefined) loc.notes = dto.notes?.trim() || null;
    if (dto.active !== undefined) loc.active = toBooleanFlag(dto.active, loc.active);
    await this.locations.save(loc);

    if (dto.courseIds) {
      await this.syncCourses(loc.id, loc.appId, dto.courseIds);
    }
    return this.mapRow(loc);
  }

  async remove(actor: UserEntity, id: number) {
    this.assertAdmin(actor);
    const loc = await this.locations.findOne({ where: { id } });
    if (!loc) throw new NotFoundException('Local não encontrado.');
    await this.locations.delete({ id });
    return { ok: true };
  }
}
