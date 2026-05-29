import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RoomType } from '../../../database/entities/enums';

export class RoomTypeConfigDto {
  @ApiProperty({ enum: RoomType })
  tipo: RoomType;

  /** Quantas salas deste tipo criar. Default 1. */
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  quantidade?: number;

  /** Max trabalhos por sala deste tipo. Default: 10 para GERAL/IC, 5 para PRATICO. */
  @ApiPropertyOptional()
  @IsOptional()
  maxTrabalhos?: number;
}

export class RunLotteryDto {
  @ApiProperty({ example: '2025-06-15', description: 'Data do evento para o sorteio.' })
  @IsDateString()
  dataEvento: string;

  /**
   * Configuração de tipos de sala. Se omitido, todas as salas são GERAL com max 10 trabalhos.
   */
  @ApiPropertyOptional({ type: [RoomTypeConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomTypeConfigDto)
  tiposSala?: RoomTypeConfigDto[];
}
