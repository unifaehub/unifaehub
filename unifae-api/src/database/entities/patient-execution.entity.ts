import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExecutionStatus } from './enums';
import { PatientEntity } from './patient.entity';
import { PrescriptionItemEntity } from './prescription-item.entity';

@Entity('patient_executions')
@Index(['patientId', 'performedAt'])
@Index(['performedAt'])
@Index(['prescriptionItemId'])
export class PatientExecutionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;

  @Column({ name: 'prescription_item_id' })
  prescriptionItemId: number;

  @ManyToOne(() => PrescriptionItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_item_id' })
  prescriptionItem: PrescriptionItemEntity;

  @Column({ name: 'performed_at', type: 'datetime' })
  performedAt: Date;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  /**
   * Escala pós-exercício (dor/esforço): 0, 2, 5, 8 ou 10.
   * Preenchido quando o paciente envia o feedback da sessão.
   */
  @Column({ name: 'post_exercise_score', type: 'smallint', nullable: true })
  postExerciseScore: number | null;

  @Column({ name: 'feedback_recorded_at', type: 'datetime', nullable: true })
  feedbackRecordedAt: Date | null;

  @Column({ type: 'enum', enum: ExecutionStatus })
  status: ExecutionStatus;
}
