import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JornadaConfigEntity } from '../../../database/entities/jornada-config.entity';
import { PresentationSectorEntity } from '../../../database/entities/presentation-sector.entity';
import { PresentationHallEntity } from '../../../database/entities/presentation-hall.entity';

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
