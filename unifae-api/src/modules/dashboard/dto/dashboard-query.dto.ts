import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

function toIntOrUndef(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

export class DashboardQueryDto {
  @IsOptional()
  @Transform(({ value }) => toIntOrUndef(value))
  @IsInt()
  @Min(1)
  appId?: number;

  @IsOptional()
  @Transform(({ value }) => toIntOrUndef(value))
  @IsInt()
  @Min(1)
  courseId?: number;

  @IsOptional()
  @Transform(({ value }) => toIntOrUndef(value))
  @IsInt()
  @IsIn([7, 30, 90])
  periodDays?: number;

  /** Filtro de data no formato YYYY-MM-DD (dia único). */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  /** Intervalo de datas no formato YYYY-MM-DD. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
}

