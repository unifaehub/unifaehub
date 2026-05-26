import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PrescriptionItemInputDto } from './prescription-item-input.dto';

export class CreatePrescriptionDto {
  @IsInt()
  patientId: number;

  @IsInt()
  courseId: number;

  @IsInt()
  appId: number;

  /** Se omitido, usa o estagiário vinculado ao paciente. */
  @IsOptional()
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsInt()
  professorId?: number | null;

  /** Episódio de cuidado; obrigatório quando há mais de um episódio ativo. */
  @IsOptional()
  @IsInt()
  careEpisodeId?: number;

  /** Justificativa / observação clínica (obrigatória no cadastro). */
  @IsString()
  @MinLength(2, { message: 'Informe a justificativa ou observação (mínimo 2 caracteres).' })
  justification: string;

  @IsOptional()
  @IsDateString()
  nextVisitDate?: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua ao menos um exercício na prescrição.' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInputDto)
  items: PrescriptionItemInputDto[];
}
