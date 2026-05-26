import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { GoogleCalendarMeetService } from '../../modules/google/services/google-calendar-meet.service';

export type MeetConferenceInput = {
  summary: string;
  description?: string | null;
  startAt: Date;
  durationMinutes: number;
  attendeeEmails: string[];
};

export type MeetConferenceResult = {
  meetUrl: string;
  calendarEventId: string | null;
  provider: 'google-oauth' | 'google-service-account' | 'stub';
};

/**
 * Facade for Meet creation — prefers OAuth2 refresh_token, then service account JWT, then dev stub.
 */
@Injectable()
export class GoogleMeetService {
  private readonly logger = new Logger(GoogleMeetService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly oauthMeet: GoogleCalendarMeetService,
  ) {}

  async createConference(input: MeetConferenceInput): Promise<MeetConferenceResult> {
    if (await this.oauthMeet.isOAuthConnected()) {
      try {
        const result = await this.oauthMeet.createConference(input);
        return {
          meetUrl: result.meetUrl,
          calendarEventId: result.calendarEventId,
          provider: result.provider,
        };
      } catch (err) {
        this.logger.warn(`OAuth Meet creation failed: ${String(err)}`);
      }
    }

    const enabled = this.config.get<boolean>('googleMeet.enabled');
    const email = this.config.get<string>('googleMeet.serviceAccountEmail') ?? '';
    const privateKey = this.config.get<string>('googleMeet.serviceAccountPrivateKey') ?? '';

    if (enabled && email && privateKey) {
      try {
        return await this.createViaServiceAccount(input, email, privateKey);
      } catch (err) {
        this.logger.warn(`Service account Meet creation failed: ${String(err)}`);
      }
    }

    const stubBase = this.config.get<string>('googleMeet.stubMeetBaseUrl') ?? '';
    if (stubBase) {
      const code = randomBytes(5).toString('hex');
      return {
        meetUrl: `${stubBase.replace(/\/$/, '')}/${code}`,
        calendarEventId: null,
        provider: 'stub',
      };
    }

    throw new BadRequestException(
      'Google Meet is not configured. Connect Google OAuth, configure a service account, or set GOOGLE_MEET_STUB_BASE_URL for staging.',
    );
  }

  async cancelConference(calendarEventId: string | null): Promise<void> {
    if (!calendarEventId) return;
    if (await this.oauthMeet.isOAuthConnected()) {
      await this.oauthMeet.cancelConference(calendarEventId);
    }
  }

  async updateConference(
    calendarEventId: string | null,
    input: Partial<MeetConferenceInput>,
  ): Promise<void> {
    if (!calendarEventId) return;
    if (await this.oauthMeet.isOAuthConnected()) {
      await this.oauthMeet.updateConference(calendarEventId, input);
    }
  }

  private async createViaServiceAccount(
    input: MeetConferenceInput,
    serviceAccountEmail: string,
    privateKey: string,
  ): Promise<MeetConferenceResult> {
    const { google } = await import('googleapis');
    const calendarId = this.config.get<string>('googleMeet.calendarId') ?? 'primary';

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const calendar = google.calendar({ version: 'v3', auth });

    const start = input.startAt;
    const end = new Date(start.getTime() + input.durationMinutes * 60_000);

    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: input.summary,
        description: input.description ?? undefined,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: input.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetUrl =
      event.data.hangoutLink ??
      event.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
      null;

    if (!meetUrl) {
      throw new BadRequestException('Google Calendar did not return a Meet link.');
    }

    return {
      meetUrl,
      calendarEventId: event.data.id ?? null,
      provider: 'google-service-account',
    };
  }
}
