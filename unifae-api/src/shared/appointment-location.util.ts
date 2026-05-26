import { AppointmentModality } from '../database/entities/enums';

/** Localização unificada para o app: presencial (endereço) ou remoto (URL). */
export type AppointmentLocationDto = {
  /** `IN_PERSON` = presencial; `REMOTE` = remoto (online). */
  mode: 'IN_PERSON' | 'REMOTE';
  /** Nome do local (somente presencial). */
  name: string | null;
  /** Endereço completo (somente presencial). */
  address: string | null;
  /** Link da consulta (somente remoto). */
  url: string | null;
};

export function mapAppointmentLocation(input: {
  modality: AppointmentModality;
  careLocation?: { name: string; address: string } | null;
  meetUrl?: string | null;
}): AppointmentLocationDto {
  if (input.modality === AppointmentModality.ONLINE) {
    return {
      mode: 'REMOTE',
      name: null,
      address: null,
      url: input.meetUrl?.trim() || null,
    };
  }
  const address = input.careLocation?.address?.trim() || null;
  return {
    mode: 'IN_PERSON',
    name: input.careLocation?.name?.trim() || null,
    address,
    url: null,
  };
}
