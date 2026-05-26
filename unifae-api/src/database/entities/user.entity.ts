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
import { UserRole } from './enums';
import { AppEntity } from './app.entity';
import { CourseEntity } from './course.entity';
import { UserSpecialtyEntity } from './user-specialty.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['appId'])
@Index(['courseId'])
@Index(['role'])
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  /**
   * Período de atividade (usado principalmente para alunos/estagiários).
   * Se `activeUntil` expirar, o usuário é inativado automaticamente no próximo login.
   */
  @Column({ name: 'active_from', type: 'date', nullable: true })
  activeFrom: string | null; // YYYY-MM-DD

  @Column({ name: 'active_until', type: 'date', nullable: true })
  activeUntil: string | null; // YYYY-MM-DD

  @Column({ name: 'course_id', nullable: true })
  courseId: number | null;

  @ManyToOne(() => CourseEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity | null;

  @Column({ name: 'app_id', nullable: true })
  appId: number | null;

  @ManyToOne(() => AppEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Primeira autenticação do usuário no sistema (capturada no login).
  @Column({ name: 'first_login_at', type: 'datetime', nullable: true })
  firstLoginAt: Date | null;

  @Column({ name: 'first_login_ip', type: 'varchar', length: 64, nullable: true })
  firstLoginIp: string | null;

  @Column({ name: 'first_login_device_id', type: 'varchar', length: 64, nullable: true })
  firstLoginDeviceId: string | null;

  @Column({ name: 'first_login_device_name', type: 'varchar', length: 255, nullable: true })
  firstLoginDeviceName: string | null;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  /** Exclusão lógica (somente administrador); diferente de `active`. */
  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  /** Caminho relativo do arquivo de foto de perfil no storage local. */
  @Column({ name: 'profile_photo_path', type: 'varchar', length: 512, nullable: true })
  profilePhotoPath: string | null;

  @OneToMany(() => UserSpecialtyEntity, (specialty) => specialty.user)
  specialties: UserSpecialtyEntity[];
}
