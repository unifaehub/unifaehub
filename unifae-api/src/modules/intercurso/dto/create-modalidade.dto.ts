import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateModalidadeDto {
  @IsString()
  @MaxLength(200)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEquipes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxMembros?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsInt()
  ordem?: number;
}
