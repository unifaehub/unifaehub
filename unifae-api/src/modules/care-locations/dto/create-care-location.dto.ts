import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { toBooleanFlag } from '../../../shared/google-maps.util';

export class CreateCareLocationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  appId: number;

  @ApiProperty({ example: 'Clínica UNIFAE — Bloco B' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: 'Av. Exemplo, 100 — Sala 12, São Paulo/SP' })
  @IsString()
  @MinLength(5)
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : toBooleanFlag(value, true)))
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Cursos que podem usar este local.', type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  courseIds?: number[];
}
