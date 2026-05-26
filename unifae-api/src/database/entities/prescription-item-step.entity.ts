import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PrescriptionItemEntity } from './prescription-item.entity';

@Entity('prescription_item_steps')
@Index(['prescriptionItemId', 'sortOrder'])
export class PrescriptionItemStepEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'prescription_item_id' })
  prescriptionItemId: number;

  @ManyToOne(() => PrescriptionItemEntity, (item) => item.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_item_id' })
  prescriptionItem: PrescriptionItemEntity;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'text' })
  description: string;
}
