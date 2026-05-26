import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCareLocationDto } from './create-care-location.dto';

export class UpdateCareLocationDto extends PartialType(OmitType(CreateCareLocationDto, ['appId'] as const)) {}
