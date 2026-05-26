import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminNoteStatus } from '../../../database/entities/admin-note.entity';

export class UpdateAdminNoteDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestedBy?: string | null;

  @IsOptional()
  @IsIn([
    AdminNoteStatus.OPEN,
    AdminNoteStatus.IN_PROGRESS,
    AdminNoteStatus.PAUSED,
    AdminNoteStatus.DONE,
    AdminNoteStatus.REJECTED,
  ])
  status?: AdminNoteStatus;

  @IsOptional()
  @IsString()
  observations?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string | null;

  /** Data de implementação/finalização (ISO ou string parseável). */
  @IsOptional()
  @IsString()
  finishedAt?: string | null;
}

