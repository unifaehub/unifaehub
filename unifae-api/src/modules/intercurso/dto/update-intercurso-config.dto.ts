import { IsArray, IsDateString, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateIntercursoConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventoNome?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  eventoLocal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  edicao?: string | null;

  @IsOptional()
  @IsString()
  descricao?: string | null;

  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  datasEvento?: string[] | null;

  @IsOptional()
  @IsDateString()
  inscricaoInicio?: string | null;

  @IsOptional()
  @IsDateString()
  inscricaoFim?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  certificadoUrl?: string | null;
}
