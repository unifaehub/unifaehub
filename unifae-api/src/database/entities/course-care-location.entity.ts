import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CourseEntity } from './course.entity';
import { CareLocationEntity } from './care-location.entity';

@Entity('course_care_locations')
@Index(['courseId', 'careLocationId'], { unique: true })
export class CourseCareLocationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @Column({ name: 'care_location_id' })
  careLocationId: number;

  @ManyToOne(() => CareLocationEntity, (loc) => loc.courseLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'care_location_id' })
  careLocation: CareLocationEntity;
}
