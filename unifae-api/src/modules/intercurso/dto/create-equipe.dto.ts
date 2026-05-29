import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MembroDto {
  @IsString()
  @MaxLength(200)
  nome: string;

  @IsString()
  @MaxLength(50)
  ra: string;

  @IsString()
  @MaxLength(200)
  curso: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  responsavel?: boolean;
}

export class CreateEquipeDto {
  @IsString()
  @MaxLength(200)
  nome: string;

  @IsString()
  @MaxLength(200)
  cursoRepresentante: string;

  @IsInt()
  @Min(1)
  modalidadeId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembroDto)
  membros?: MembroDto[];

  @IsOptional()
  @IsEmail()
  emailContato?: string;
}
