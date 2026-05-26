import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PatchConsentTermDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  version?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
