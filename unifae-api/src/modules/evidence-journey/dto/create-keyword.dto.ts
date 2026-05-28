import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, Matches, MaxLength } from 'class-validator';

export class CreateKeywordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  palavra: string;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  dataAgendamento: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'horaInicio deve ser no formato HH:MM ou HH:MM:SS' })
  horaInicio: string;
}
