import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntercursoModalidadeEntity } from '../../../database/entities/intercurso-modalidade.entity';
import { CreateModalidadeDto } from '../dto/create-modalidade.dto';

@Injectable()
export class ModalidadesService {
  constructor(
    @InjectRepository(IntercursoModalidadeEntity)
    private readonly repo: Repository<IntercursoModalidadeEntity>,
  ) {}

  list() {
    return this.repo.find({ order: { ordem: 'ASC', nome: 'ASC' } });
  }

  listAtivas() {
    return this.repo.find({ where: { ativo: true }, order: { ordem: 'ASC', nome: 'ASC' } });
  }

  async findOne(id: number): Promise<IntercursoModalidadeEntity> {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Modalidade não encontrada.');
    return m;
  }

  async create(dto: CreateModalidadeDto): Promise<IntercursoModalidadeEntity> {
    const m = this.repo.create({
      nome:       dto.nome,
      descricao:  dto.descricao ?? null,
      maxEquipes: dto.maxEquipes ?? null,
      maxMembros: dto.maxMembros ?? 5,
      ativo:      dto.ativo ?? true,
      ordem:      dto.ordem ?? 0,
    });
    return this.repo.save(m);
  }

  async update(id: number, dto: Partial<CreateModalidadeDto>): Promise<IntercursoModalidadeEntity> {
    const m = await this.findOne(id);
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  async remove(id: number): Promise<void> {
    const m = await this.findOne(id);
    await this.repo.remove(m);
  }
}
