import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateResultadoDto {
  @IsInt()
  @Min(1)
  equipeId: number;

  @IsInt()
  @Min(1)
  modalidadeId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  posicao?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  pontuacao?: number | null;

  @IsOptional()
  @IsString()
  observacao?: string | null;
}
