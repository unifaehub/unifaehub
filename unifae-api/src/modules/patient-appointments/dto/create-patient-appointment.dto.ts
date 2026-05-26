import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { AppointmentModality } from '../../../database/entities/enums';

export class CreatePatientAppointmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  patientId: number;

  @ApiProperty({ example: '2026-05-22T14:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ enum: AppointmentModality })
  @IsEnum(AppointmentModality)
  modality: AppointmentModality;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  professionalUserId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  careLocationId?: number | null;

  @ApiPropertyOptional({ description: 'Se ONLINE e omitido, tenta criar Meet automaticamente.' })
  @IsOptional()
  @IsBoolean()
  autoCreateMeet?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  meetUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
