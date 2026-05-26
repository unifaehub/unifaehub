import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(255)
  password: string;

  /** Ignorado para usuários com papel STUDENT (usa o próprio id). */
  @IsOptional()
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsInt()
  professorId?: number | null;

  @IsInt()
  courseId: number;

  @IsInt()
  appId: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
