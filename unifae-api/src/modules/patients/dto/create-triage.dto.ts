import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PatientRiskLevel } from '../../../database/entities/enums';

export class CreateTriageDto {
  @IsString()
  @IsOptional()
  functionDetails?: string;

  @IsString()
  @IsOptional()
  symptomsDetails?: string;

  @IsString()
  @IsOptional()
  safetyDetails?: string;

  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  digitalLiteracyScore?: number;

  @IsString()
  @IsOptional()
  socialSupportDetails?: string;

  @IsEnum(PatientRiskLevel)
  riskLevel: PatientRiskLevel;

  @IsString()
  @IsOptional()
  justification?: string;
}
