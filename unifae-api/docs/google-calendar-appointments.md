# Google Calendar / Meet — Agendamentos

Arquitetura integrada ao `unifae-api` (NestJS) com OAuth2, refresh token criptografado e criação automática de Google Meet para consultas **ONLINE**.

## Estrutura de pastas

```
src/
├── common/filters/http-exception.filter.ts
├── shared/crypto/token-cipher.service.ts
├── database/
│   ├── entities/google-oauth-credential.entity.ts
│   └── scripts/add-google-oauth-credentials.sql
├── infra/google-meet/                    # Facade Meet (OAuth → SA → stub)
├── modules/
│   ├── google/
│   │   ├── controllers/google-oauth.controller.ts
│   │   ├── dto/
│   │   ├── integrations/
│   │   │   ├── google-calendar.integration.ts
│   │   │   └── google-oauth-client.factory.ts
│   │   ├── repositories/google-oauth-token.repository.ts
│   │   ├── services/
│   │   │   ├── google-oauth.service.ts
│   │   │   ├── google-oauth-state.service.ts
│   │   │   └── google-calendar-meet.service.ts
│   │   └── google.module.ts
│   └── patient-appointments/           # Agendamentos (appointments)
│       ├── validators/appointment-schedule.validator.ts
│       ├── ports/appointment-notification.port.ts   # WhatsApp futuro
│       ├── services/appointment-notification.service.ts
│       └── patient-appointments.service.ts
```

## Mapeamento de campos (modelo existente)

| Especificação | Campo no banco / API |
|---------------|----------------------|
| `patientId` | `patientId` |
| `physiotherapistId` | `professionalUserId` |
| `date` + `startTime` / `endTime` | `scheduledAt` + `durationMinutes` |
| `type` PRESENTIAL | `modality: IN_PERSON` |
| `type` ONLINE | `modality: ONLINE` |
| `meetLink` | `meetUrl` |
| `googleEventId` | `meetCalendarEventId` |
| `status` | `status` (SCHEDULED, COMPLETED, CANCELLED) |

## Variáveis de ambiente

```env
# OAuth2 (recomendado produção)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/v1/google/oauth/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=change-me-min-16-chars
GOOGLE_CALENDAR_ID=primary
GOOGLE_OAUTH_SUCCESS_REDIRECT=http://localhost:5173/settings?tab=google

# Service account (fallback)
GOOGLE_MEET_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# Homologação sem Google
GOOGLE_MEET_STUB_BASE_URL=https://meet.google.com/lookup
```

Execute o SQL: `src/database/scripts/add-google-oauth-credentials.sql`

## Fluxo OAuth

1. Admin autenticado: `GET /api/v1/google/oauth/connect`
2. Abrir `authUrl` no navegador → consentimento Google
3. Callback: `GET /api/v1/google/oauth/callback?code=...&state=...`
4. `refresh_token` criptografado (AES-256-GCM) em `google_oauth_credentials`

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/google/oauth/status` | JWT ADMIN/COORD | Status da conexão |
| GET | `/google/oauth/connect` | JWT ADMIN/COORD | URL de autorização |
| GET | `/google/oauth/callback` | Público | Callback OAuth |
| DELETE | `/google/oauth/disconnect` | JWT ADMIN | Revoga credencial local |
| GET/POST/PATCH | `/appointments/*` | JWT staff | CRUD agendamentos |

## Exemplos de requisição / resposta

### Conectar Google

```http
GET /api/v1/google/oauth/connect
Authorization: Bearer <token>
```

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "eyJ1c2VySWQiOjEsImV4cCI6...signature"
}
```

### Criar consulta ONLINE (Meet automático)

```http
POST /api/v1/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 12,
  "scheduledAt": "2026-05-28T14:00:00.000Z",
  "modality": "ONLINE",
  "durationMinutes": 50,
  "autoCreateMeet": true,
  "notes": "Primeira sessão — avaliação inicial"
}
```

```json
{
  "id": 45,
  "patientId": 12,
  "patientName": "Maria Silva",
  "modality": "ONLINE",
  "status": "SCHEDULED",
  "scheduledAt": "2026-05-28T14:00:00.000Z",
  "endsAt": "2026-05-28T14:50:00.000Z",
  "meetUrl": "https://meet.google.com/abc-defg-hij",
  "meetCalendarEventId": "eventIdFromGoogle",
  "careLocationId": null
}
```

### Criar consulta PRESENCIAL

```json
{
  "patientId": 12,
  "scheduledAt": "2026-05-29T10:00:00.000Z",
  "modality": "IN_PERSON",
  "careLocationId": 3,
  "durationMinutes": 50
}
```

### Conflito de horário (409)

```json
{
  "statusCode": 409,
  "error": "AppointmentScheduleConflict",
  "message": "The physiotherapist already has an appointment in this time slot.",
  "professionalConflict": true,
  "patientConflict": false
}
```

### Cancelar consulta

```http
POST /api/v1/appointments/45/cancel
Authorization: Bearer <token>
```

Remove o evento do Google Calendar quando `meetCalendarEventId` existir e dispara `notifyAppointmentCancelled` (preparado para WhatsApp).

## Regras de negócio

- **ONLINE** + `autoCreateMeet !== false` → cria evento Calendar com `conferenceDataVersion: 1` e `hangoutsMeet`
- **IN_PERSON** → exige `careLocationId`, não gera Meet
- Conflito: mesmo paciente ou mesmo fisioterapeuta não pode ter dois agendamentos `SCHEDULED` sobrepostos
- Atualização de data/hora ONLINE → `updateConference` no Google (quando OAuth conectado)

## Próximos passos (WhatsApp)

Implementar adapter que implemente `AppointmentNotificationPort` e registre no `PatientAppointmentsModule`:

```typescript
{ provide: APPOINTMENT_NOTIFICATION_PORT, useClass: WhatsAppAppointmentNotificationService }
```

Payload já inclui `meetUrl`, telefone (quando existir no modelo) e horários ISO.
