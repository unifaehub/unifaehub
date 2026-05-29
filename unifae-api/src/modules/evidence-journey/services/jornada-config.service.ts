import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JornadaConfigEntity } from '../../../database/entities/jornada-config.entity';
import { PresentationSectorEntity } from '../../../database/entities/presentation-sector.entity';
import { PresentationHallEntity } from '../../../database/entities/presentation-hall.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { RoomProfessorEntity } from '../../../database/entities/room-professor.entity';
import { RoomBestWorkEntity } from '../../../database/entities/room-best-work.entity';
import { EvaluationEntity } from '../../../database/entities/evaluation.entity';
import { WorkGroupEntity } from '../../../database/entities/work-group.entity';
import { ProfessorAvailabilityEntity } from '../../../database/entities/professor-availability.entity';
import { RoomWorkEntity } from '../../../database/entities/room-work.entity';

class UpsertConfigDto {
  eventoNome?: string | null;
  eventoLocal?: string | null;
  datasEvento?: string[] | null;
}

class CreateSectorDto {
  nome: string;
  descricao?: string | null;
}

class CreateHallDto {
  nome: string;
  andar?: string | null;
  capacidade?: number | null;
}

@Injectable()
export class JornadaConfigService {
  constructor(
    @InjectRepository(JornadaConfigEntity)
    private readonly configs: Repository<JornadaConfigEntity>,
    @InjectRepository(PresentationSectorEntity)
    private readonly sectors: Repository<PresentationSectorEntity>,
    @InjectRepository(PresentationHallEntity)
    private readonly halls: Repository<PresentationHallEntity>,
    @InjectRepository(PresentationRoomEntity)
    private readonly rooms: Repository<PresentationRoomEntity>,
    @InjectRepository(RoomProfessorEntity)
    private readonly roomProfessors: Repository<RoomProfessorEntity>,
    @InjectRepository(RoomBestWorkEntity)
    private readonly roomBestWorks: Repository<RoomBestWorkEntity>,
    @InjectRepository(EvaluationEntity)
    private readonly evaluations: Repository<EvaluationEntity>,
    @InjectRepository(WorkGroupEntity)
    private readonly workGroups: Repository<WorkGroupEntity>,
    @InjectRepository(ProfessorAvailabilityEntity)
    private readonly availabilities: Repository<ProfessorAvailabilityEntity>,
    @InjectRepository(RoomWorkEntity)
    private readonly roomWorks: Repository<RoomWorkEntity>,
  ) {}

  // ── Config (singleton) ────────────────────────────────────────────────────

  async getConfig(): Promise<JornadaConfigEntity> {
    // findOne com where:{} não funciona no TypeORM 0.3 — usar find+take
    const rows = await this.configs.find({ order: { id: 'ASC' }, take: 1 });
    let cfg = rows[0] ?? null;
    if (!cfg) {
      cfg = this.configs.create({});
      cfg = await this.configs.save(cfg);
    }
    return cfg;
  }

  /** Retorna um resumo do que seria deletado ao resetar o evento. */
  async getResetSummary() {
    const cfg = await this.getConfig();
    const datas = cfg.datasEvento ?? [];
    const roomCount  = await this.rooms.count();
    const avalCount  = await this.evaluations.count();
    const availCount = datas.length
      ? await this.availabilities.count({ where: { dataEvento: In(datas) } })
      : 0;
    return { rooms: roomCount, evaluations: avalCount, availabilities: availCount, datas };
  }

  /**
   * Apaga todo o contexto do evento em cascata:
   * avaliações → banca → melhores → grupos → salas → disponibilidades → config
   */
  async resetEvent() {
    const cfg = await this.getConfig();
    const datas = cfg.datasEvento ?? [];

    // 1. Salas existentes
    const allRooms = await this.rooms.find({ select: ['id'] });
    if (allRooms.length) {
      const roomIds = allRooms.map((r) => r.id);

      // 2. Trabalhos via room_works
      const rws         = await this.roomWorks.find({ where: { salaId: In(roomIds) as any } });
      const trabalhoIds = rws.map((rw) => rw.trabalhoId);

      // 3. Avaliações
      if (trabalhoIds.length) {
        await this.evaluations.delete({ trabalhoId: In(trabalhoIds) });
      }
      // 4. Banca das salas
      await this.roomProfessors.delete({ salaId: In(roomIds) });
      // 5. Melhores trabalhos
      await this.roomBestWorks.delete({ salaId: In(roomIds) });
      // 6. room_works
      await this.roomWorks.delete({ salaId: In(roomIds) as any });
      // 7. Grupos de alunos
      if (trabalhoIds.length) {
        await this.workGroups.delete({ trabalhoId: In(trabalhoIds) });
      }
      // 8. Salas
      await this.rooms.delete({ id: In(roomIds) });
    }

    // 7. Disponibilidades nas datas do evento
    if (datas.length) {
      await this.availabilities.delete({ dataEvento: In(datas) });
    }

    // 8. Limpar campos do config (mantém setores/salas físicas)
    cfg.eventoNome  = null;
    cfg.eventoLocal = null;
    cfg.datasEvento = null;
    await this.configs.save(cfg);

    return {
      ok: true,
      deleted: {
        rooms: allRooms.length,
        availabilities: datas.length,
      },
    };
  }

  async updateConfig(dto: UpsertConfigDto): Promise<JornadaConfigEntity> {
    const cfg = await this.getConfig();
    if (dto.eventoNome !== undefined) cfg.eventoNome = dto.eventoNome ?? null;
    if (dto.eventoLocal !== undefined) cfg.eventoLocal = dto.eventoLocal ?? null;
    if (dto.datasEvento !== undefined) cfg.datasEvento = dto.datasEvento ?? null;
    return this.configs.save(cfg);
  }

  // ── Sectors ───────────────────────────────────────────────────────────────

  async listSectors() {
    return this.sectors.find({ relations: ['salas'], order: { nome: 'ASC' } });
  }

  async createSector(dto: CreateSectorDto) {
    if (!dto.nome?.trim()) throw new BadRequestException('Nome é obrigatório.');
    const sector = this.sectors.create({ nome: dto.nome.trim(), descricao: dto.descricao ?? null });
    return this.sectors.save(sector);
  }

  async updateSector(id: number, dto: Partial<CreateSectorDto>) {
    const sector = await this.sectors.findOne({ where: { id } });
    if (!sector) throw new NotFoundException('Setor não encontrado.');
    if (dto.nome !== undefined) sector.nome = dto.nome.trim();
    if (dto.descricao !== undefined) sector.descricao = dto.descricao ?? null;
    return this.sectors.save(sector);
  }

  async deleteSector(id: number) {
    const sector = await this.sectors.findOne({ where: { id } });
    if (!sector) throw new NotFoundException('Setor não encontrado.');
    await this.sectors.remove(sector);
    return { ok: true };
  }

  // ── Halls ─────────────────────────────────────────────────────────────────

  async listHalls(setorId: number) {
    await this._requireSector(setorId);
    return this.halls.find({ where: { setorId }, order: { nome: 'ASC' } });
  }

  async createHall(setorId: number, dto: CreateHallDto) {
    await this._requireSector(setorId);
    if (!dto.nome?.trim()) throw new BadRequestException('Nome é obrigatório.');
    const hall = this.halls.create({
      setorId,
      nome: dto.nome.trim(),
      andar: dto.andar ?? null,
      capacidade: dto.capacidade ?? null,
    });
    return this.halls.save(hall);
  }

  async updateHall(id: number, dto: Partial<CreateHallDto>) {
    const hall = await this.halls.findOne({ where: { id } });
    if (!hall) throw new NotFoundException('Sala não encontrada.');
    if (dto.nome !== undefined) hall.nome = dto.nome.trim();
    if (dto.andar !== undefined) hall.andar = dto.andar ?? null;
    if (dto.capacidade !== undefined) hall.capacidade = dto.capacidade ?? null;
    return this.halls.save(hall);
  }

  async deleteHall(id: number) {
    const hall = await this.halls.findOne({ where: { id } });
    if (!hall) throw new NotFoundException('Sala não encontrada.');
    await this.halls.remove(hall);
    return { ok: true };
  }

  private async _requireSector(id: number) {
    const exists = await this.sectors.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Setor não encontrado.');
  }
}
