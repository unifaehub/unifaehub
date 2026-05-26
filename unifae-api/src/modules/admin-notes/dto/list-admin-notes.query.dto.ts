import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AdminNoteStatus } from '../../../database/entities/admin-note.entity';

export class ListAdminNotesQueryDto {
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  active?: 'active' | 'inactive' | 'all';

  @IsOptional()
  @IsIn([
    AdminNoteStatus.OPEN,
    AdminNoteStatus.IN_PROGRESS,
    AdminNoteStatus.PAUSED,
    AdminNoteStatus.DONE,
    AdminNoteStatus.REJECTED,
  ])
  status?: AdminNoteStatus;

  /** filtro por texto do solicitante (case-insensitive contains) */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  requestedBy?: string;
}

