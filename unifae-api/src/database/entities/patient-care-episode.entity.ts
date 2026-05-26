import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CareEpisodeStatus } from './enums';
import { ClinicalCaseEntity } from './clinical-case.entity';
import { PatientEntity } from './patient.entity';
import { PrescriptionEntity } from './prescription.entity';

@Entity('patient_care_episodes')
@Index(['patientId'])
export class PatientCareEpisodeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => PatientEntity, (p) => p.careEpisodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;

  @Column({ name: 'clinical_case_id', nullable: true })
  clinicalCaseId: number | null;

  @ManyToOne(() => ClinicalCaseEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clinical_case_id' })
  clinicalCase: ClinicalCaseEntity | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: CareEpisodeStatus,
    default: CareEpisodeStatus.ACTIVE,
  })
  status: CareEpisodeStatus;

  @Column({ name: 'started_at', type: 'date' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'date', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PrescriptionEntity, (rx) => rx.careEpisode)
  prescriptions: PrescriptionEntity[];
}
