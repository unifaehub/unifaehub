import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PatientEntity } from './patient.entity';
import { PatientPainLevel } from './enums';

@Entity('patient_pain_logs')
@Index(['patientId', 'day'], { unique: true })
@Index(['day'])
export class PatientPainLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;

  /** Dia local (YYYY-MM-DD no MySQL DATE) para garantir 1x registro/dia. */
  @Column({ type: 'date' })
  day: string;

  @Column({ name: 'reported_at', type: 'datetime' })
  reportedAt: Date;

  @Column({ type: 'enum', enum: PatientPainLevel })
  level: PatientPainLevel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

