import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CloseRoomDto {
  @ApiProperty({ description: 'Senha do professor para confirmar o fechamento.' })
  @IsString()
  @MinLength(4)
  senha: string;

  @ApiPropertyOptional({ description: 'ID do melhor trabalho da sala, selecionado pelo líder.' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  melhorTrabalhoId?: number;
}
