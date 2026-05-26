import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

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
  provider: 'google' | 'stub';
};

@Injectable()
export class GoogleMeetService {
  private readonly logger = new Logger(GoogleMeetService.name);

  constructor(private readonly config: ConfigService) {}

  async createConference(input: MeetConferenceInput): Promise<MeetConferenceResult> {
    const enabled = this.config.get<boolean>('googleMeet.enabled');
    const email = this.config.get<string>('googleMeet.serviceAccountEmail') ?? '';
    const privateKey = this.config.get<string>('googleMeet.serviceAccountPrivateKey') ?? '';

    if (enabled && email && privateKey) {
      try {
        return await this.createViaGoogleCalendar(input, email, privateKey);
      } catch (err) {
        this.logger.warn(`Falha ao criar Google Meet: ${String(err)}`);
      }
    }

    const stubBase = this.config.get<string>('googleMeet.stubBaseUrl') ?? '';
    if (stubBase) {
      const code = randomBytes(5).toString('hex');
      return {
        meetUrl: `${stubBase.replace(/\/$/, '')}/${code}`,
        calendarEventId: null,
        provider: 'stub',
      };
    }

    throw new BadRequestException(
      'Integração Google Meet não configurada. Defina GOOGLE_MEET_ENABLED e credenciais ou GOOGLE_MEET_STUB_BASE_URL para homologação.',
    );
  }

  private async createViaGoogleCalendar(
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
            requestId: randomBytes(8).toString('hex'),
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
      throw new BadRequestException('Google Calendar não retornou link do Meet.');
    }

    return {
      meetUrl,
      calendarEventId: event.data.id ?? null,
      provider: 'google',
    };
  }
}
