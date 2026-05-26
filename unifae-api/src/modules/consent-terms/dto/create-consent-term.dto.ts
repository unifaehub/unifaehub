import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConsentTermDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @IsString()
  @MinLength(1)
  content: string;

  /** Se true, desativa os demais termos do mesmo curso. No primeiro termo do curso o valor é ignorado (nasce ativo). */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
