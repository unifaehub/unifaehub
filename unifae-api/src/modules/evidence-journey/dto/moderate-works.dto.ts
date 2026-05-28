import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, ArrayMinSize } from 'class-validator';
import { EvidenceWorkStatus } from '../../../database/entities/enums';

export class ModerateWorksDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];

  @ApiProperty({ enum: [EvidenceWorkStatus.APROVADO, EvidenceWorkStatus.REPROVADO] })
  @IsEnum([EvidenceWorkStatus.APROVADO, EvidenceWorkStatus.REPROVADO])
  status: EvidenceWorkStatus.APROVADO | EvidenceWorkStatus.REPROVADO;
}
