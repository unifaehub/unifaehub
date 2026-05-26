import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateClinicalCaseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;
}
