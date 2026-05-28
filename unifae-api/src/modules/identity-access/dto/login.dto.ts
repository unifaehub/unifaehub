import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum LoginAccessMode {
  /** Painel sem filtro de app (somente ADMIN). */
  GLOBAL = 'GLOBAL',
  /** Acesso no contexto de um aplicativo específico. */
  APP = 'APP',
  /** Acesso à Jornada de Evidências (professor via registro_funcional ou aluno via RA). */
  JORNADA = 'JORNADA',
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'admin@unifae.local', description: 'E-mail do usuário (modos GLOBAL e APP).' })
  @ValidateIf((o: LoginDto) => !o.identifier)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123456', description: 'RA ou registro_funcional (modo JORNADA).' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({ example: 'Admin@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: LoginAccessMode, example: LoginAccessMode.APP })
  @IsEnum(LoginAccessMode)
  accessMode: LoginAccessMode;

  @ApiPropertyOptional({ example: 1, description: 'Obrigatório quando accessMode = APP.' })
  @ValidateIf((o: LoginDto) => o.accessMode === LoginAccessMode.APP)
  @IsInt()
  @IsPositive()
  appId?: number;
}
