import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LotteryService } from '../services/lottery.service';

/**
 * Endpoint público (sem autenticação) para exibição ao vivo no projetor.
 * Retorna o status das salas para a data fornecida.
 */
@ApiTags('Jornada — Público')
@Controller('evidence-journey/public')
export class PublicRoomsController {
  constructor(private readonly lottery: LotteryService) {}

  @Get('rooms-status')
  getRoomsStatus(@Query('dataEvento') dataEvento: string) {
    return this.lottery.getRoomsWithStatus(dataEvento);
  }
}
