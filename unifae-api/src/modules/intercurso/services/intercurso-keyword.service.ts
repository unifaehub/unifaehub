import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntercursoKeywordEntity } from '../../../database/entities/intercurso-keyword.entity';
import { CreateIntercursoKeywordDto } from '../dto/create-intercurso-keyword.dto';

@Injectable()
export class IntercursoKeywordService {
  constructor(
    @InjectRepository(IntercursoKeywordEntity)
    private readonly keywords: Repository<IntercursoKeywordEntity>,
  ) {}

  list() {
    return this.keywords.find({ order: { dataAgendamento: 'DESC', horaInicio: 'DESC' } });
  }

  async getCurrentKeyword(): Promise<IntercursoKeywordEntity | null> {
    const today  = new Date().toISOString().split('T')[0];
    const now    = new Date().toTimeString().substring(0, 8);
    const expiry = '23:00:00';

    if (now >= expiry) return null;

    return this.keywords
      .createQueryBuilder('k')
      .where('k.dataAgendamento = :today', { today })
      .andWhere('k.horaInicio <= :now', { now })
      .orderBy('k.horaInicio', 'DESC')
      .getOne();
  }

  async create(dto: CreateIntercursoKeywordDto): Promise<IntercursoKeywordEntity> {
    const kw = this.keywords.create({
      palavra:          dto.palavra,
      dataAgendamento:  dto.dataAgendamento,
      horaInicio:       dto.horaInicio,
    });
    return this.keywords.save(kw);
  }

  async remove(id: number): Promise<void> {
    const kw = await this.keywords.findOne({ where: { id } });
    if (!kw) throw new NotFoundException('Palavra-chave não encontrada.');
    await this.keywords.remove(kw);
  }
}
