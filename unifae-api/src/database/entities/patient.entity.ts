import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CourseEntity } from './course.entity';
import { AppEntity } from './app.entity';
import { PatientCareEpisodeEntity } from './patient-care-episode.entity';
import { PatientRiskLevel } from './enums';
import { PatientAssessmentEntity } from './patient-assessment.entity';

@Entity('patients')
@Index(['userId'], { unique: true })
@Index(['studentId'])
@Index(['professorId'])
@Index(['courseId', 'appId'])
export class PatientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

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

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @Column({ name: 'app_id' })
  appId: number;

  @ManyToOne(() => AppEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;

  @OneToMany(() => PatientCareEpisodeEntity, (e) => e.patient)
  careEpisodes: PatientCareEpisodeEntity[];

  @Column({
    name: 'latest_risk_level',
    type: 'enum',
    enum: PatientRiskLevel,
    default: PatientRiskLevel.PENDING,
  })
  latestRiskLevel: PatientRiskLevel;

  @OneToMany(() => PatientAssessmentEntity, (a) => a.patient)
  assessments: PatientAssessmentEntity[];
}
