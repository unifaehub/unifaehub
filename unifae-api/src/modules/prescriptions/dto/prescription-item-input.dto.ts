import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PrescriptionItemStepInputDto } from './prescription-item-step-input.dto';

export class PrescriptionItemInputDto {
  @IsInt()
  exerciseId: number;

  /** Etapas do passo a passo (1 a 20). Se informado, substitui o texto livre de instructions. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemStepInputDto)
  steps?: PrescriptionItemStepInputDto[];

  @IsOptional()
  @IsString()
  instructions?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  repetitions?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
