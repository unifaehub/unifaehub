import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DynamicQuestionEntity } from '../../../database/entities/dynamic-question.entity';
import { CreateQuestionDto } from '../dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(DynamicQuestionEntity)
    private readonly questions: Repository<DynamicQuestionEntity>,
  ) {}

  async list() {
    return this.questions.find({ order: { tipo: 'ASC', ordem: 'ASC' } });
  }

  async create(dto: CreateQuestionDto): Promise<DynamicQuestionEntity> {
    const q = this.questions.create({
      textoPergunta: dto.textoPergunta,
      tipo: dto.tipo,
      ordem: dto.ordem ?? 0,
      ativo: dto.ativo ?? true,
    });
    return this.questions.save(q);
  }

  async update(id: number, dto: Partial<CreateQuestionDto>): Promise<DynamicQuestionEntity> {
    const q = await this.questions.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Pergunta não encontrada.');
    Object.assign(q, dto);
    return this.questions.save(q);
  }

  async remove(id: number): Promise<void> {
    const q = await this.questions.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Pergunta não encontrada.');
    await this.questions.remove(q);
  }
}
