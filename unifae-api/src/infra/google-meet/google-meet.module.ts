import { Global, Module } from '@nestjs/common';
import { GoogleModule } from '../../modules/google/google.module';
import { GoogleMeetService } from './google-meet.service';

@Global()
@Module({
  imports: [GoogleModule],
  providers: [GoogleMeetService],
  exports: [GoogleMeetService],
})
export class GoogleMeetModule {}
