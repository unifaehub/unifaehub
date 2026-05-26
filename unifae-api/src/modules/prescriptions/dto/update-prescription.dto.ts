import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PrescriptionStatus } from '../../../database/entities/enums';
import { PrescriptionItemInputDto } from './prescription-item-input.dto';

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsInt()
  professorId?: number | null;

  @IsOptional()
  @IsInt()
  careEpisodeId?: number;

  @IsOptional()
  @IsString()
  justification?: string | null;

  @IsOptional()
  @IsDateString()
  nextVisitDate?: string | null;

  /** Só coordenador, professor ou administrador alteram status (aprovação). */
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @ValidateIf((o: UpdatePrescriptionDto) => o.items !== undefined)
  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua ao menos um exercício na prescrição.' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInputDto)
  items?: PrescriptionItemInputDto[];
}
