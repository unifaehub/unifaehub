import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CareEpisodeStatus } from '../../../database/entities/enums';

export class CreateCareEpisodeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  clinicalCaseId?: number | null;

  @IsOptional()
  @IsEnum(CareEpisodeStatus)
  status?: CareEpisodeStatus;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string | null;
}
