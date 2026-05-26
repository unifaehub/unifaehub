import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PrescriptionStatus } from './enums';
import { PatientEntity } from './patient.entity';
import { UserEntity } from './user.entity';
import { AppEntity } from './app.entity';
import { PrescriptionItemEntity } from './prescription-item.entity';
import { PatientCareEpisodeEntity } from './patient-care-episode.entity';

@Entity('prescriptions')
@Index(['patientId'])
@Index(['status'])
@Index(['appId'])
@Index(['createdAt'])
@Index(['careEpisodeId'])
export class PrescriptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: UserEntity;

  @Column({ name: 'professor_id', nullable: true })
  professorId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'professor_id' })
  professor: UserEntity | null;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.PENDING,
  })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({ name: 'next_visit_date', type: 'datetime', nullable: true })
  nextVisitDate: Date | null;

  @Column({ name: 'app_id' })
  appId: number;

  @ManyToOne(() => AppEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;

  @Column({ name: 'care_episode_id', nullable: true })
  careEpisodeId: number | null;

  @ManyToOne(() => PatientCareEpisodeEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'care_episode_id' })
  careEpisode: PatientCareEpisodeEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Preenchido ao aprovar ou rejeitar (quem decidiu e quando). */
  @Column({ name: 'decided_at', type: 'datetime', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decided_by_id', nullable: true })
  decidedById: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decided_by_id' })
  decidedBy: UserEntity | null;

  @OneToMany(() => PrescriptionItemEntity, (i) => i.prescription)
  items: PrescriptionItemEntity[];
}
