import { IsEmail, IsString, MinLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  /** Código de 8 caracteres enviado por e-mail (espaços são ignorados). */
  @IsString()
  @MinLength(1, { message: 'Informe o código recebido por e-mail.' })
  code: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  @Match('password', { message: 'A confirmação da nova senha deve ser idêntica à nova senha.' })
  confirmPassword: string;
}
