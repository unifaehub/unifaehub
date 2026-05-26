import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CourseNavItemDto } from '../course-navigation.types';

const NAV_KEYS = [
  'overview',
  'patients',
  'exercises',
  'prescriptions',
  'approvals',
  'library',
] as const;

class CourseNavItemClass implements CourseNavItemDto {
  @IsIn(NAV_KEYS)
  key!: CourseNavItemDto['key'];

  @IsOptional()
  @IsString()
  label?: string | null;

  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  sortOrder!: number;

  @IsOptional()
  @IsString()
  icon?: string | null;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** null => desvincular curso do app */
  @IsOptional()
  @IsInt()
  appId?: number | null;

  /** Substitui o menu lateral do curso (null = voltar ao padrão automático no front). */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseNavItemClass)
  navigationJson?: CourseNavItemDto[] | null;

  /** Rótulo para agrupamento de classificação / casos neste curso. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  caseContextLabel?: string | null;
}

