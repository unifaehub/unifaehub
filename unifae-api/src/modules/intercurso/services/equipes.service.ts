import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IntercursoEquipeEntity } from '../../../database/entities/intercurso-equipe.entity';
import { IntercursoEquipeStatus } from '../../../database/entities/enums';
import { IntercursoModalidadeEntity } from '../../../database/entities/intercurso-modalidade.entity';
import { CreateEquipeDto } from '../dto/create-equipe.dto';
import { ModerateEquipesDto } from '../dto/moderate-equipes.dto';

@Injectable()
export class EquipesService {
  constructor(
    @InjectRepository(IntercursoEquipeEntity)
    private readonly equipes: Repository<IntercursoEquipeEntity>,
    @InjectRepository(IntercursoModalidadeEntity)
    private readonly modalidades: Repository<IntercursoModalidadeEntity>,
  ) {}

  async list(query: { status?: string; modalidadeId?: string; q?: string; page?: string; limit?: string }) {
    const page  = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const skip  = (page - 1) * limit;

    const qb = this.equipes.createQueryBuilder('e')
      .leftJoinAndSelect('e.modalidade', 'mod')
      .where('e.deletedAt IS NULL')
      .orderBy('e.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    if (query.modalidadeId) qb.andWhere('e.modalidadeId = :mid', { mid: Number(query.modalidadeId) });
    if (query.q) {
      qb.andWhere('(e.nome LIKE :q OR e.cursoRepresentante LIKE :q)', { q: `%${query.q}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number): Promise<IntercursoEquipeEntity> {
    const e = await this.equipes.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['modalidade'],
    });
    if (!e) throw new NotFoundException('Equipe não encontrada.');
    return e;
  }

  async create(dto: CreateEquipeDto): Promise<IntercursoEquipeEntity> {
    const modalidade = await this.modalidades.findOne({ where: { id: dto.modalidadeId, ativo: true } });
    if (!modalidade) throw new NotFoundException('Modalidade não encontrada ou inativa.');

    if (modalidade.maxEquipes) {
      const count = await this.equipes.count({
        where: {
          modalidadeId: dto.modalidadeId,
          status: IntercursoEquipeStatus.APROVADA,
          deletedAt: IsNull(),
        },
      });
      if (count >= modalidade.maxEquipes) {
        throw new BadRequestException(`Modalidade "${modalidade.nome}" já atingiu o máximo de equipes aprovadas.`);
      }
    }

    const equipe = this.equipes.create({
      nome:              dto.nome,
      cursoRepresentante: dto.cursoRepresentante,
      modalidadeId:      dto.modalidadeId,
      membros:           dto.membros ?? null,
      emailContato:      dto.emailContato ?? null,
      status:            IntercursoEquipeStatus.PENDENTE,
    });
    return this.equipes.save(equipe);
  }

  async moderate(dto: ModerateEquipesDto): Promise<void> {
    if (!dto.ids.length) return;
    await this.equipes
      .createQueryBuilder()
      .update(IntercursoEquipeEntity)
      .set({ status: dto.status, motivo: dto.motivo ?? null })
      .whereInIds(dto.ids)
      .andWhere('deleted_at IS NULL')
      .execute();
  }

  async softDelete(id: number): Promise<void> {
    const e = await this.findOne(id);
    e.deletedAt = new Date();
    e.status    = IntercursoEquipeStatus.INATIVA;
    await this.equipes.save(e);
  }

  async getStats() {
    const [total, pendentes, aprovadas, reprovadas] = await Promise.all([
      this.equipes.count({ where: { deletedAt: IsNull() } }),
      this.equipes.count({ where: { status: IntercursoEquipeStatus.PENDENTE, deletedAt: IsNull() } }),
      this.equipes.count({ where: { status: IntercursoEquipeStatus.APROVADA, deletedAt: IsNull() } }),
      this.equipes.count({ where: { status: IntercursoEquipeStatus.REPROVADA, deletedAt: IsNull() } }),
    ]);
    return { total, pendentes, aprovadas, reprovadas };
  }
}
