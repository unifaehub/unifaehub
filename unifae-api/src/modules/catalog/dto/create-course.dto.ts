import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsInt()
  appId?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** Rótulo para "casos" na UI deste curso (ex.: Caso clínico, Cenário jurídico). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  caseContextLabel?: string | null;
}
