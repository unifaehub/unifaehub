import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeywordEntity } from '../../../database/entities/keyword.entity';
import { CreateKeywordDto } from '../dto/create-keyword.dto';

@Injectable()
export class KeywordService {
  constructor(
    @InjectRepository(KeywordEntity)
    private readonly keywords: Repository<KeywordEntity>,
  ) {}

  async list() {
    return this.keywords.find({ order: { dataAgendamento: 'DESC', horaInicio: 'DESC' } });
  }

  async getCurrentKeyword(): Promise<KeywordEntity | null> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().substring(0, 8);
    return this.keywords
      .createQueryBuilder('k')
      .where('k.dataAgendamento = :today', { today })
      .andWhere('k.horaInicio <= :now', { now })
      .orderBy('k.horaInicio', 'DESC')
      .getOne();
  }

  async create(dto: CreateKeywordDto): Promise<KeywordEntity> {
    const kw = this.keywords.create({
      palavra: dto.palavra,
      dataAgendamento: dto.dataAgendamento,
      horaInicio: dto.horaInicio,
    });
    return this.keywords.save(kw);
  }

  async remove(id: number): Promise<void> {
    const kw = await this.keywords.findOne({ where: { id } });
    if (!kw) throw new NotFoundException('Palavra-chave não encontrada.');
    await this.keywords.remove(kw);
  }
}
