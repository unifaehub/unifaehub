import { IsDateString, IsString, Matches, MaxLength } from 'class-validator';

export class CreateIntercursoKeywordDto {
  @IsString()
  @MaxLength(500)
  palavra: string;

  @IsDateString()
  dataAgendamento: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'horaInicio deve estar no formato HH:MM ou HH:MM:SS' })
  horaInicio: string;
}
