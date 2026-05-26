import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateMenuNodeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9][a-z0-9-_:]*$/i, {
    message: 'Use apenas letras, números, hífen, dois-pontos e sublinhado.',
  })
  key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string | null;

  /** Nome da rota Vue (ex.: course-hub) ou vazio para rota dinâmica /n/:menuNodeId */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  routeName?: string | null;

  @IsOptional()
  @IsBoolean()
  includeInNewCourses?: boolean;
}
