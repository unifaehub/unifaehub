import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PrescriptionEntity } from './prescription.entity';
import { ExerciseEntity } from './exercise.entity';
import { PrescriptionItemStepEntity } from './prescription-item-step.entity';

@Entity('prescription_items')
@Index(['prescriptionId'])
export class PrescriptionItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'prescription_id' })
  prescriptionId: number;

  @ManyToOne(() => PrescriptionEntity, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_id' })
  prescription: PrescriptionEntity;

  @Column({ name: 'exercise_id' })
  exerciseId: number;

  @ManyToOne(() => ExerciseEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: ExerciseEntity;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  repetitions: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => PrescriptionItemStepEntity, (step) => step.prescriptionItem)
  steps: PrescriptionItemStepEntity[];
}
