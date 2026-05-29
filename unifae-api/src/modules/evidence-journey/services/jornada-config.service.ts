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

export const DEFAULT_SECOES = [
  { id: 'introducao', titulo: 'Introdução', ordem: 1, obrigatorio: true },
  { id: 'objetivos',  titulo: 'Objetivos',  ordem: 2, obrigatorio: true },
  { id: 'metodo',     titulo: 'Método',     ordem: 3, obrigatorio: true },
  { id: 'resultados', titulo: 'Resultados', ordem: 4, obrigatorio: true },
  { id: 'conclusoes', titulo: 'Conclusões', ordem: 5, obrigatorio: true },
];

class UpsertConfigDto {
  eventoNome?: string | null;
  eventoLocal?: string | null;
  datasEvento?: string[] | null;
  submissaoInicio?: string | null;
  submissaoFim?: string | null;
  avaliacaoInicio?: string | null;
  avaliacaoFim?: string | null;
  secoesResumo?: { id: string; titulo: string; ordem: number; obrigatorio: boolean }[] | null;
}

class CreateSectorDto {
  nome: string;
  descricao?: string | null;
}

class CreateHallDto {
  nome: string;
  andar?: string | null;
  bloco?: string | null;
  capacidade?: number | null;
  tipoSala?: string | null;
  maxTrabalhos?: number | null;
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
    if (dto.submissaoInicio !== undefined) cfg.submissaoInicio = dto.submissaoInicio ?? null;
    if (dto.submissaoFim !== undefined) cfg.submissaoFim = dto.submissaoFim ?? null;
    if (dto.avaliacaoInicio !== undefined) cfg.avaliacaoInicio = dto.avaliacaoInicio ?? null;
    if (dto.avaliacaoFim !== undefined) cfg.avaliacaoFim = dto.avaliacaoFim ?? null;
    if (dto.secoesResumo !== undefined) cfg.secoesResumo = dto.secoesResumo ?? null;
    return this.configs.save(cfg);
  }

  async getPublicConfig() {
    const cfg = await this.getConfig();
    const today = new Date().toISOString().slice(0, 10);
    return {
      submissaoInicio: cfg.submissaoInicio,
      submissaoFim: cfg.submissaoFim,
      submissaoAberta: (
        (!cfg.submissaoInicio || cfg.submissaoInicio <= today) &&
        (!cfg.submissaoFim    || cfg.submissaoFim    >= today)
      ),
      secoesResumo: cfg.secoesResumo ?? DEFAULT_SECOES,
    };
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
      nome:         dto.nome.trim(),
      andar:        dto.andar ?? null,
      bloco:        dto.bloco ?? null,
      capacidade:   dto.capacidade ?? null,
      tipoSala:     (dto.tipoSala as any) ?? null,
      maxTrabalhos: dto.maxTrabalhos ?? null,
    });
    return this.halls.save(hall);
  }

  async updateHall(id: number, dto: Partial<CreateHallDto>) {
    const hall = await this.halls.findOne({ where: { id } });
    if (!hall) throw new NotFoundException('Sala não encontrada.');
    if (dto.nome !== undefined)         hall.nome         = dto.nome.trim();
    if (dto.andar !== undefined)        hall.andar        = dto.andar ?? null;
    if (dto.bloco !== undefined)        (hall as any).bloco        = dto.bloco ?? null;
    if (dto.capacidade !== undefined)   hall.capacidade   = dto.capacidade ?? null;
    if (dto.tipoSala !== undefined)     (hall as any).tipoSala     = dto.tipoSala ?? null;
    if (dto.maxTrabalhos !== undefined) (hall as any).maxTrabalhos = dto.maxTrabalhos ?? null;
    return this.halls.save(hall);
  }

  /** Retorna todas as salas físicas (para o serviço de sorteio). */
  async getAllHalls() {
    return this.halls.find({ order: { tipoSala: 'ASC', nome: 'ASC' } });
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
