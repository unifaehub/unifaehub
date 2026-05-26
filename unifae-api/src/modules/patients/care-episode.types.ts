import type { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import type { CareEpisodeStatus } from '../../database/entities/enums';

export type CareEpisodeResponse = {
  id: number;
  patientId: number;
  title: string;
  description: string | null;
  clinicalCaseId: number | null;
  clinicalCaseName: string | null;
  status: CareEpisodeStatus;
  startedAt: string;
  endedAt: string | null;
  prescriptionCount: number;
};

export function toDateOnly(v: Date | string): string {
  if (typeof v === 'string') return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

export function utcDateFromYmd(s: string): Date {
  const t = s.trim().slice(0, 10);
  const [y, m, d] = t.split('-').map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function mapCareEpisodeEntity(
  e: PatientCareEpisodeEntity,
  prescriptionCount: number,
): CareEpisodeResponse {
  return {
    id: e.id,
    patientId: e.patientId,
    title: e.title,
    description: e.description,
    clinicalCaseId: e.clinicalCaseId,
    clinicalCaseName: e.clinicalCase?.name?.trim() ?? null,
    status: e.status,
    startedAt: toDateOnly(e.startedAt),
    endedAt: e.endedAt ? toDateOnly(e.endedAt) : null,
    prescriptionCount,
  };
}
