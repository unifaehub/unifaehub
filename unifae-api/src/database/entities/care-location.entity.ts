import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppEntity } from './app.entity';
import { CourseCareLocationEntity } from './course-care-location.entity';

@Entity('care_locations')
@Index(['appId', 'active'])
export class CareLocationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'app_id' })
  appId: number;

  @ManyToOne(() => AppEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'tinyint', default: 1 })
  active: boolean;

  @OneToMany(() => CourseCareLocationEntity, (link) => link.careLocation)
  courseLinks: CourseCareLocationEntity[];
}
