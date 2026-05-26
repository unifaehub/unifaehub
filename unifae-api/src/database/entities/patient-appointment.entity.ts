import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AppointmentModality, AppointmentStatus } from './enums';
import { PatientEntity } from './patient.entity';
import { AppEntity } from './app.entity';
import { CourseEntity } from './course.entity';
import { UserEntity } from './user.entity';
import { CareLocationEntity } from './care-location.entity';

@Entity('patient_appointments')
@Index(['patientId', 'scheduledAt'])
@Index(['appId', 'scheduledAt'])
@Index(['status', 'scheduledAt'])
export class PatientAppointmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;

  @Column({ name: 'app_id' })
  appId: number;

  @ManyToOne(() => AppEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @Column({ name: 'professional_user_id' })
  professionalUserId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'professional_user_id' })
  professional: UserEntity;

  @Column({ name: 'created_by_user_id' })
  createdByUserId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: UserEntity;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt: Date;

  @Column({ name: 'duration_minutes', type: 'int', default: 50 })
  durationMinutes: number;

  @Column({ type: 'enum', enum: AppointmentModality })
  modality: AppointmentModality;

  @Column({ name: 'care_location_id', nullable: true })
  careLocationId: number | null;

  @ManyToOne(() => CareLocationEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'care_location_id' })
  careLocation: CareLocationEntity | null;

  @Column({ name: 'meet_url', type: 'varchar', length: 512, nullable: true })
  meetUrl: string | null;

  @Column({ name: 'meet_calendar_event_id', type: 'varchar', length: 255, nullable: true })
  meetCalendarEventId: string | null;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
