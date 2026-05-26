import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClinicalCaseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @Type(() => Number)
  @IsInt()
  courseId: number;

  @Type(() => Number)
  @IsInt()
  appId: number;
}
