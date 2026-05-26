import { IsInt, IsPositive } from 'class-validator';

export class AcceptConsentDto {
  @IsInt()
  @IsPositive()
  consentTermId: number;
}
