import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PatientPainLevel } from '../../../database/entities/enums';

export class SubmitPainDto {
  @ApiProperty({ enum: PatientPainLevel, example: PatientPainLevel.NONE })
  @IsEnum(PatientPainLevel)
  level: PatientPainLevel;
}

