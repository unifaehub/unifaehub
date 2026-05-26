import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @Type(() => Number)
  @IsInt()
  clinicalCaseId: number;

  /** Deve pertencer ao mesmo caso clínico (tipos cadastrados em “Tipos do caso”). */
  @Type(() => Number)
  @IsInt()
  categoryTypeDefinitionId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  /** Último nível da classificação (vinculação de exercícios ao paciente ocorre nestes nós). */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isLeafLevel?: boolean;
}
