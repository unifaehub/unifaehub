import { Injectable, Logger } from '@nestjs/common';
import {
  CalendarEventResult,
  CreateCalendarEventInput,
  GoogleCalendarIntegration,
  UpdateCalendarEventInput,
} from '../integrations/google-calendar.integration';
import { GoogleOAuthService } from './google-oauth.service';

export type MeetConferenceInput = {
  summary: string;
  description?: string | null;
  startAt: Date;
  durationMinutes: number;
  attendeeEmails: string[];
};

export type MeetConferenceResult = {
  meetUrl: string;
  calendarEventId: string;
  provider: 'google-oauth';
};

@Injectable()
export class GoogleCalendarMeetService {
  private readonly logger = new Logger(GoogleCalendarMeetService.name);

  constructor(
    private readonly oauthService: GoogleOAuthService,
    private readonly calendarIntegration: GoogleCalendarIntegration,
  ) {}

  async isOAuthConnected(): Promise<boolean> {
    const auth = await this.oauthService.getAuthorizedClient();
    return auth !== null;
  }

  async createConference(input: MeetConferenceInput): Promise<MeetConferenceResult> {
    const authCtx = await this.oauthService.getAuthorizedClient();
    if (!authCtx) {
      throw new Error('Google OAuth is not connected.');
    }

    const endAt = new Date(input.startAt.getTime() + input.durationMinutes * 60_000);
    const event = await this.calendarIntegration.createEventWithMeet(
      authCtx.client,
      authCtx.calendarId,
      this.toCreateInput(input, endAt),
    );

    return {
      meetUrl: event.meetUrl,
      calendarEventId: event.eventId,
      provider: 'google-oauth',
    };
  }

  async updateConference(
    eventId: string,
    input: Partial<MeetConferenceInput>,
  ): Promise<void> {
    const authCtx = await this.oauthService.getAuthorizedClient();
    if (!authCtx) return;

    const patch: UpdateCalendarEventInput = { eventId };
    if (input.summary != null) patch.summary = input.summary;
    if (input.description !== undefined) patch.description = input.description;
    if (input.startAt) {
      const duration = input.durationMinutes ?? 50;
      patch.startAt = input.startAt;
      patch.endAt = new Date(input.startAt.getTime() + duration * 60_000);
    }
    if (input.attendeeEmails) patch.attendeeEmails = input.attendeeEmails;

    await this.calendarIntegration.updateEvent(authCtx.client, authCtx.calendarId, patch);
    this.logger.debug(`Google Calendar event ${eventId} updated`);
  }

  async cancelConference(eventId: string): Promise<void> {
    const authCtx = await this.oauthService.getAuthorizedClient();
    if (!authCtx) return;

    await this.calendarIntegration.cancelEvent(authCtx.client, authCtx.calendarId, eventId);
    this.logger.debug(`Google Calendar event ${eventId} cancelled`);
  }

  private toCreateInput(input: MeetConferenceInput, endAt: Date): CreateCalendarEventInput {
    return {
      summary: input.summary,
      description: input.description,
      startAt: input.startAt,
      endAt,
      attendeeEmails: input.attendeeEmails,
    };
  }
}
