import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../../../database/entities/enums';
import { CoordinatorSpecialtyDto } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  extraRoles?: UserRole[];

  @IsOptional()
  @IsInt()
  appId?: number | null;

  @IsOptional()
  @IsInt()
  courseId?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** YYYY-MM-DD */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  activeFrom?: string | null;

  /** YYYY-MM-DD */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  activeUntil?: string | null;

  /** Especialidades da coordenadora; exatamente uma deve ser marcada como principal. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatorSpecialtyDto)
  coordinatorSpecialties?: CoordinatorSpecialtyDto[];
}

