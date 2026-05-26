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
import { UserEntity } from './user.entity';
import { PatientRiskLevel } from './enums';

@Entity('patient_assessments')
@Index(['patientId'])
export class PatientAssessmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;

  @Column({ name: 'assessor_id' })
  assessorId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'assessor_id' })
  assessor: UserEntity;

  // --- 5 Pilares da Triagem ---

  @Column({ type: 'text', nullable: true })
  functionDetails: string;

  @Column({ type: 'text', nullable: true })
  symptomsDetails: string;

  @Column({ type: 'text', nullable: true })
  safetyDetails: string;

  @Column({ type: 'int', default: 0 })
  digitalLiteracyScore: number; // 1-5 ou similar

  @Column({ type: 'text', nullable: true })
  socialSupportDetails: string;

  // --- Classificação ---

  @Column({
    type: 'enum',
    enum: PatientRiskLevel,
    default: PatientRiskLevel.PENDING,
  })
  riskLevel: PatientRiskLevel;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
