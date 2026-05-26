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
import { ConsentTermEntity } from './consent-term.entity';
import { AppEntity } from './app.entity';

@Entity('patient_consent_acceptances')
@Index(['patientId'])
@Index(['consentTermId'])
export class PatientConsentAcceptanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;

  @Column({ name: 'consent_term_id' })
  consentTermId: number;

  @ManyToOne(() => ConsentTermEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'consent_term_id' })
  consentTerm: ConsentTermEntity;

  @CreateDateColumn({ name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'document_hash', type: 'varchar', length: 128, nullable: true })
  documentHash: string | null;

  @Column({ name: 'app_id' })
  appId: number;

  @ManyToOne(() => AppEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;
}
