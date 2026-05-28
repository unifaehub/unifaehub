import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { QuestionType } from '../../../database/entities/enums';

export class CreateQuestionDto {
  @ApiProperty()
  @IsString()
  textoPergunta: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  tipo: QuestionType;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
