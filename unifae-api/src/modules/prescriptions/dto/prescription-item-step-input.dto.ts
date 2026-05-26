import { IsString, MaxLength, MinLength } from 'class-validator';

export class PrescriptionItemStepInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;
}
