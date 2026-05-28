import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionType } from './enums';

@Entity('dynamic_questions')
@Index(['tipo', 'ativo'])
export class DynamicQuestionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'texto_pergunta', type: 'text' })
  textoPergunta: string;

  @Column({ type: 'enum', enum: QuestionType })
  tipo: QuestionType;

  @Column({ type: 'int', default: 0 })
  ordem: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
