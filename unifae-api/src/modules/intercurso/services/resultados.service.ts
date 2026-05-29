import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntercursoResultadoEntity } from '../../../database/entities/intercurso-resultado.entity';
import { CreateResultadoDto } from '../dto/create-resultado.dto';

@Injectable()
export class ResultadosService {
  constructor(
    @InjectRepository(IntercursoResultadoEntity)
    private readonly repo: Repository<IntercursoResultadoEntity>,
  ) {}

  listByModalidade(modalidadeId: number) {
    return this.repo.find({
      where: { modalidadeId },
      relations: ['equipe'],
      order: { posicao: 'ASC', pontuacao: 'DESC' },
    });
  }

  listAll() {
    return this.repo.find({
      relations: ['equipe', 'modalidade'],
      order: { modalidadeId: 'ASC', posicao: 'ASC' },
    });
  }

  async upsert(dto: CreateResultadoDto): Promise<IntercursoResultadoEntity> {
    let r = await this.repo.findOne({
      where: { equipeId: dto.equipeId, modalidadeId: dto.modalidadeId },
    });

    if (r) {
      r.posicao    = dto.posicao ?? null;
      r.pontuacao  = dto.pontuacao != null ? String(dto.pontuacao) : null;
      r.observacao = dto.observacao ?? null;
    } else {
      r = this.repo.create({
        equipeId:    dto.equipeId,
        modalidadeId: dto.modalidadeId,
        posicao:     dto.posicao ?? null,
        pontuacao:   dto.pontuacao != null ? String(dto.pontuacao) : null,
        observacao:  dto.observacao ?? null,
      });
    }
    return this.repo.save(r);
  }

  async remove(id: number): Promise<void> {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Resultado não encontrado.');
    await this.repo.remove(r);
  }
}
