import { Injectable } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { GoogleIntegrationException } from '../exceptions/google-integration.exception';

export type CreateCalendarEventInput = {
  summary: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
  attendeeEmails?: string[];
  timeZone?: string;
};

export type CalendarEventResult = {
  eventId: string;
  meetUrl: string;
  htmlLink: string | null;
};

export type UpdateCalendarEventInput = {
  eventId: string;
  summary?: string;
  description?: string | null;
  startAt?: Date;
  endAt?: Date;
  attendeeEmails?: string[];
  timeZone?: string;
};

@Injectable()
export class GoogleCalendarIntegration {
  private calendar(auth: OAuth2Client): calendar_v3.Calendar {
    return google.calendar({ version: 'v3', auth });
  }

  async createEventWithMeet(
    auth: OAuth2Client,
    calendarId: string,
    input: CreateCalendarEventInput,
  ): Promise<CalendarEventResult> {
    try {
      const timeZone = input.timeZone ?? 'America/Sao_Paulo';
      const response = await this.calendar(auth).events.insert({
        calendarId,
        conferenceDataVersion: 1,
        sendUpdates: 'none',
        requestBody: {
          summary: input.summary,
          description: input.description ?? undefined,
          start: { dateTime: input.startAt.toISOString(), timeZone },
          end: { dateTime: input.endAt.toISOString(), timeZone },
          attendees: (input.attendeeEmails ?? []).map((email) => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        },
      });

      const meetUrl = this.extractMeetUrl(response.data);
      if (!meetUrl) {
        throw new GoogleIntegrationException('Google Calendar did not return a Meet link.');
      }

      const eventId = response.data.id;
      if (!eventId) {
        throw new GoogleIntegrationException('Google Calendar did not return an event id.');
      }

      return {
        eventId,
        meetUrl,
        htmlLink: response.data.htmlLink ?? null,
      };
    } catch (err) {
      if (err instanceof GoogleIntegrationException) throw err;
      throw new GoogleIntegrationException('Failed to create Google Calendar event.', err);
    }
  }

  async updateEvent(
    auth: OAuth2Client,
    calendarId: string,
    input: UpdateCalendarEventInput,
  ): Promise<void> {
    try {
      const timeZone = input.timeZone ?? 'America/Sao_Paulo';
      const patch: calendar_v3.Schema$Event = {};

      if (input.summary != null) patch.summary = input.summary;
      if (input.description !== undefined) patch.description = input.description ?? undefined;
      if (input.startAt) {
        patch.start = { dateTime: input.startAt.toISOString(), timeZone };
      }
      if (input.endAt) {
        patch.end = { dateTime: input.endAt.toISOString(), timeZone };
      }
      if (input.attendeeEmails) {
        patch.attendees = input.attendeeEmails.map((email) => ({ email }));
      }

      await this.calendar(auth).events.patch({
        calendarId,
        eventId: input.eventId,
        sendUpdates: 'none',
        requestBody: patch,
      });
    } catch (err) {
      throw new GoogleIntegrationException('Failed to update Google Calendar event.', err);
    }
  }

  async cancelEvent(auth: OAuth2Client, calendarId: string, eventId: string): Promise<void> {
    try {
      await this.calendar(auth).events.delete({
        calendarId,
        eventId,
        sendUpdates: 'none',
      });
    } catch (err) {
      const status = (err as { code?: number })?.code;
      if (status === 404 || status === 410) return;
      throw new GoogleIntegrationException('Failed to cancel Google Calendar event.', err);
    }
  }

  private extractMeetUrl(event: calendar_v3.Schema$Event): string | null {
    return (
      event.hangoutLink ??
      event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
      null
    );
  }
}
