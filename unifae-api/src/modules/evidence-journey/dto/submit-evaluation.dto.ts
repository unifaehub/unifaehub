import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { PresentationStatus } from '../../../database/entities/enums';

export class EvaluationItemDto {
  @ApiProperty()
  @IsInt()
  perguntaId: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @ValidateIf((o: EvaluationItemDto) => o.nota !== undefined)
  @IsInt()
  @Min(1)
  @Max(10)
  nota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentario?: string;
}

export class SubmitEvaluationDto {
  @ApiProperty({ enum: PresentationStatus })
  @IsEnum(PresentationStatus)
  statusApresentacao: PresentationStatus;

  @ApiPropertyOptional({ type: [EvaluationItemDto] })
  @IsOptional()
  respostas?: EvaluationItemDto[];
}
