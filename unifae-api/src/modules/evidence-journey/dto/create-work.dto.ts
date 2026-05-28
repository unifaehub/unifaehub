import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateWorkDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  titulo: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  cursoTrabalho: string;

  @ApiPropertyOptional({ description: 'ID do aluno. Preenchido pelo admin; se omitido usa o usuário autenticado.' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  alunoId?: number;
}
