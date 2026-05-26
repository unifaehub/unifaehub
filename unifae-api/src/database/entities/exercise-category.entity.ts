import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExerciseEntity } from './exercise.entity';
import { CategoryEntity } from './category.entity';

@Entity('exercise_categories')
@Index(['exerciseId'])
@Index(['categoryId'])
export class ExerciseCategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exercise_id' })
  exerciseId: number;

  @ManyToOne(() => ExerciseEntity, (e) => e.exerciseCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: ExerciseEntity;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => CategoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;
}
