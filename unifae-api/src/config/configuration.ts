export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'unifae_management',
    synchronize: process.env.TYPEORM_SYNC === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@unifae.local',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
  },
  uploads: {
    /** Pasta base (absoluta ou relativa ao cwd) para arquivos de exercícios */
    root: process.env.UPLOAD_ROOT ?? 'uploads',
    maxFileMb: parseInt(process.env.UPLOAD_MAX_MB ?? '50', 10),
  },
  swagger: {
    enabled:
      process.env.SWAGGER_ENABLED === 'true' ||
      (process.env.NODE_ENV ?? 'development') !== 'production',
    user: process.env.SWAGGER_USER?.trim() ?? '',
    password: process.env.SWAGGER_PASSWORD?.trim() ?? '',
  },
  mail: {
    smtpHost: process.env.MAIL_SMTP_HOST ?? 'smtp.gmail.com',
    smtpPort: parseInt(process.env.MAIL_SMTP_PORT ?? '465', 10),
    /** Para porta 465 use true; para 587 costuma ser false + STARTTLS */
    smtpSecure: process.env.MAIL_SMTP_SECURE !== 'false',
    smtpUser: process.env.MAIL_SMTP_USER ?? '',
    smtpPass: process.env.MAIL_SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'UNIFAE Hub <noreply@unifae.local>',
  },
  googleMeet: {
    enabled: process.env.GOOGLE_MEET_ENABLED === 'true',
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() ?? 'primary',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? '',
    serviceAccountPrivateKey: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    /** Quando a API do Google não está configurada, gera link de demonstração (somente dev/homolog). */
    stubMeetBaseUrl: process.env.GOOGLE_MEET_STUB_BASE_URL?.trim() ?? '',
  },
  googleOAuth: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? '',
    /** AES key material — never commit production values. Min 16 characters. */
    tokenEncryptionKey: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ?? '',
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() ?? 'primary',
    /** Frontend URL after successful OAuth (optional). */
    successRedirectUrl: process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT?.trim() ?? '',
    stateTtlSeconds: parseInt(process.env.GOOGLE_OAUTH_STATE_TTL_SECONDS ?? '600', 10),
  },
  passwordReset: {
    tokenTtlMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? '60', 10),
    /** Ex.: unifae://redefinir-senha — o app abre com ?token= */
    deepLinkBase: process.env.PASSWORD_RESET_DEEP_LINK_BASE?.trim() ?? '',
    /** Ex.: https://app.unifae.edu.br — enviado como link /redefinir-senha?token= */
    publicWebBase: process.env.PASSWORD_RESET_PUBLIC_WEB_BASE?.trim() ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
});
