import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { IntercursoEquipeStatus } from '../../../database/entities/enums';

export class ModerateEquipesDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsEnum(IntercursoEquipeStatus)
  status: IntercursoEquipeStatus;

  @IsOptional()
  @IsString()
  motivo?: string;
}
