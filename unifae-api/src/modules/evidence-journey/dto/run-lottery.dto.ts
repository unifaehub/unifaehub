import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RunLotteryDto {
  @ApiProperty({ example: '2025-06-15', description: 'Data do evento para o sorteio.' })
  @IsDateString()
  dataEvento: string;
}
