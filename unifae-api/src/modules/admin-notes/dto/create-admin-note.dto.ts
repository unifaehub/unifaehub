import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AdminNoteStatus } from '../../../database/entities/admin-note.entity';

export class CreateAdminNoteDto {
  @IsString()
  @MinLength(3)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestedBy?: string;

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
  observations?: string;
}

