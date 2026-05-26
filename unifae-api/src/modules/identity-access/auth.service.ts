import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'node:crypto';
import { Repository } from 'typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { PasswordResetTokenEntity } from '../../database/entities/password-reset-token.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { PatientAppointmentEntity } from '../../database/entities/patient-appointment.entity';
import { AppointmentStatus } from '../../database/entities/enums';
import { UserDeviceEntity } from '../../database/entities/user-device.entity';
import { PrescriptionStatus, UserRole } from '../../database/entities/enums';
import { UserEntity } from '../../database/entities/user.entity';
import type { RequestContext } from '../../common/http/request-context';
import { AuditService } from '../audit/audit.service';
import { LoginAccessMode, LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { MailService } from './mail.service';
import { ConsentTermsService } from '../consent-terms/consent-terms.service';
import { mapAppointmentLocation } from '../../shared/appointment-location.util';

export type AuthSessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  appId: number | null;
  courseId: number | null;
  /** Próxima visita (agenda ou prescrição); só preenchido para `PATIENT`. */
  nextVisitDate: string | null;
  /** Próximas agendas confirmadas (online ou presencial). */
  upcomingAppointments: {
    id: number;
    scheduledAt: string;
    modality: string;
    location: {
      mode: 'IN_PERSON' | 'REMOTE';
      name: string | null;
      address: string | null;
      url: string | null;
    };
  }[];
};

/** Sem 0, O, 1, I para reduzir erro de leitura. */
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectRepository(UserDeviceEntity)
    private readonly userDevices: Repository<UserDeviceEntity>,
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptions: Repository<PrescriptionEntity>,
    @InjectRepository(PatientAppointmentEntity)
    private readonly appointments: Repository<PatientAppointmentEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokens: Repository<PasswordResetTokenEntity>,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly consentTerms: ConsentTermsService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserEntity | null> {
    const user = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password);
    return ok ? user : null;
  }

  async listAppsForLogin(): Promise<Pick<AppEntity, 'id' | 'name'>[]> {
    return this.apps.find({
      where: { active: true },
      order: { name: 'ASC' },
      select: ['id', 'name'],
    });
  }

  private async resolvePatientScheduling(userId: number): Promise<{
    nextVisitDate: string | null;
    upcomingAppointments: AuthSessionUser['upcomingAppointments'];
  }> {
    const patient = await this.patients.findOne({
      where: { userId },
      select: { id: true },
    });
    if (!patient) return { nextVisitDate: null, upcomingAppointments: [] };

    const now = new Date();
    const rxRow = await this.prescriptions
      .createQueryBuilder('rx')
      .select('MIN(rx.nextVisitDate)', 'dt')
      .where('rx.patientId = :pid', { pid: patient.id })
      .andWhere('rx.status = :st', { st: PrescriptionStatus.APPROVED })
      .andWhere('rx.nextVisitDate IS NOT NULL')
      .andWhere('rx.nextVisitDate >= :now', { now })
      .getRawOne<{ dt: Date | string | null }>();

    const apptRows = await this.appointments.find({
      where: { patientId: patient.id, status: AppointmentStatus.SCHEDULED },
      relations: { careLocation: true },
      order: { scheduledAt: 'ASC' },
      take: 20,
    });

    const upcomingAppointments = apptRows
      .filter((a) => a.scheduledAt >= now)
      .map((a) => ({
        id: a.id,
        scheduledAt: a.scheduledAt.toISOString(),
        modality: a.modality,
        location: mapAppointmentLocation({
          modality: a.modality,
          careLocation: a.careLocation,
          meetUrl: a.meetUrl,
        }),
      }));

    const candidates: Date[] = [];
    if (rxRow?.dt != null) {
      const d = rxRow.dt instanceof Date ? rxRow.dt : new Date(rxRow.dt);
      if (!Number.isNaN(d.getTime())) candidates.push(d);
    }
    for (const a of upcomingAppointments) {
      const d = new Date(a.scheduledAt);
      if (!Number.isNaN(d.getTime())) candidates.push(d);
    }
    candidates.sort((a, b) => a.getTime() - b.getTime());

    return {
      nextVisitDate: candidates[0]?.toISOString() ?? null,
      upcomingAppointments,
    };
  }

  async buildSessionUser(user: UserEntity): Promise<AuthSessionUser> {
    const scheduling =
      user.role === UserRole.PATIENT
        ? await this.resolvePatientScheduling(user.id)
        : { nextVisitDate: null, upcomingAppointments: [] };
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      appId: user.appId,
      courseId: user.courseId,
      nextVisitDate: scheduling.nextVisitDate,
      upcomingAppointments: scheduling.upcomingAppointments,
    };
  }

  async login(dto: LoginDto, ctx?: RequestContext) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    if (user.deletedAt) throw new UnauthorizedException('Usuário removido do sistema.');

    // Inativação automática (principalmente para alunos por período).
    if (!user.active) throw new UnauthorizedException('Usuário inativo.');
    if (user.activeUntil) {
      const until = new Date(`${user.activeUntil}T00:00:00`);
      const now = new Date();
      // expirou ao virar do dia seguinte
      if (now >= new Date(until.getTime() + 86400000)) {
        user.active = false;
        await this.users.save(user);
        throw new UnauthorizedException('Usuário inativo (período expirado).');
      }
    }

    if (dto.accessMode === LoginAccessMode.GLOBAL) {
      if (user.role !== UserRole.ADMIN) {
        throw new UnauthorizedException(
          'Acesso a todos os aplicativos é exclusivo de administradores. Selecione o aplicativo ao qual você pertence.',
        );
      }
    } else {
      if (dto.appId == null) {
        throw new UnauthorizedException('Selecione o aplicativo.');
      }
      const appExists = await this.apps.exist({
        where: { id: dto.appId, active: true },
      });
      if (!appExists) {
        throw new UnauthorizedException('Aplicativo inválido ou inativo.');
      }
      if (user.role !== UserRole.ADMIN && user.appId !== dto.appId) {
        throw new UnauthorizedException(
          'Seu usuário não pertence a este aplicativo.',
        );
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      appId: user.appId,
      courseId: user.courseId,
    };

    // Persistência de primeiro login + dispositivo
    const now = new Date();
    const deviceId = ctx?.deviceId ?? null;
    const deviceName = ctx?.deviceName ?? null;
    const ipAddress = ctx?.ipAddress ?? null;
    const userAgent = ctx?.userAgent ?? null;

    user.lastLoginAt = now;
    if (!user.firstLoginAt) {
      user.firstLoginAt = now;
      user.firstLoginIp = ipAddress;
      user.firstLoginDeviceId = deviceId;
      user.firstLoginDeviceName = deviceName;
    }
    await this.users.save(user);

    if (deviceId) {
      const existing = await this.userDevices.findOne({
        where: { userId: user.id, deviceId },
      });
      if (!existing) {
        await this.userDevices.save(
          this.userDevices.create({
            userId: user.id,
            deviceId,
            deviceName,
            ipAddress,
            userAgent,
            firstSeenAt: now,
            lastSeenAt: now,
          }),
        );
      } else {
        existing.lastSeenAt = now;
        existing.deviceName = deviceName ?? existing.deviceName;
        existing.ipAddress = ipAddress ?? existing.ipAddress;
        existing.userAgent = userAgent ?? existing.userAgent;
        await this.userDevices.save(existing);
      }
    }

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'auth',
      entityId: String(user.id),
      metadata: { accessMode: dto.accessMode },
      ctx: ctx ?? null,
    });

    const consentRequired = await this.consentTerms.getPendingConsent(user);
    return {
      access_token: await this.jwt.signAsync(payload),
      user: await this.buildSessionUser(user),
      consentRequired,
    };
  }

  async pendingConsent(user: UserEntity) {
    return this.consentTerms.getPendingConsent(user);
  }

  async acceptConsent(
    user: UserEntity,
    consentTermId: number,
    ctx?: RequestContext,
  ) {
    return this.consentTerms.acceptConsent(user, consentTermId, ctx ?? null);
  }

  private userMayUsePasswordReset(user: UserEntity): boolean {
    if (user.deletedAt) return false;
    if (!user.active) return false;
    if (user.activeUntil) {
      const until = new Date(`${user.activeUntil}T00:00:00`);
      const now = new Date();
      if (now >= new Date(until.getTime() + 86400000)) return false;
    }
    return true;
  }

  private hashPasswordResetToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private generateRecoveryCode(): string {
    let out = '';
    for (let i = 0; i < 8; i++) {
      out += RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)];
    }
    return out;
  }

  private normalizeRecoveryCode(code: string): string {
    return code.replace(/\s/g, '').toUpperCase();
  }

  /**
   * Confere se o e-mail existe; envia código de 8 caracteres por e-mail.
   */
  async requestPasswordReset(
    email: string,
    ctx?: RequestContext,
  ): Promise<{ message: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: normalized })
      .getOne();

    if (!user) {
      throw new NotFoundException('Não encontramos e-mail cadastrado.');
    }
    if (!this.userMayUsePasswordReset(user)) {
      throw new BadRequestException(
        'Esta conta não permite recuperação de senha no momento.',
      );
    }

    const nodeEnv = this.config.get<string>('nodeEnv') ?? 'development';
    const smtpOk = this.mail.isConfigured();
    if (!smtpOk && nodeEnv !== 'development') {
      this.logger.error(
        'PASSWORD_RESET: SMTP não configurado — não é possível enviar o código.',
      );
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail. Tente novamente mais tarde.',
      );
    }

    await this.passwordResetTokens.delete({ userId: user.id });
    const plainCode = this.generateRecoveryCode();
    const ttl =
      this.config.get<{ tokenTtlMinutes: number }>('passwordReset')?.tokenTtlMinutes ?? 60;
    const expiresAt = new Date(Date.now() + Math.max(5, ttl) * 60_000);
    const row = this.passwordResetTokens.create({
      userId: user.id,
      tokenHash: this.hashPasswordResetToken(plainCode),
      expiresAt,
    });
    await this.passwordResetTokens.save(row);

    if (smtpOk) {
      try {
        await this.mail.sendRecoveryCodeEmail(user.email, plainCode, user.name);
      } catch (err) {
        this.logger.error('Falha ao enviar e-mail de redefinição de senha', err);
        await this.passwordResetTokens.delete({ id: row.id });
        throw new ServiceUnavailableException(
          'Não foi possível enviar o e-mail. Tente novamente mais tarde.',
        );
      }
    } else {
      this.mail.logDevRecoveryCodeHint(user.email, plainCode);
    }

    // Histórico permanece em audit_logs; linhas em password_reset_tokens são só estado temporário.
    await this.audit.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      entity: 'auth',
      entityId: String(user.id),
      metadata: {
        emailSentViaSmtp: smtpOk,
        codeExpiresAt: expiresAt.toISOString(),
        resetTokenRowId: row.id,
      },
      ctx: ctx ?? null,
    });

    return {
      message:
        'Enviamos um código de 8 caracteres para o e-mail informado. Use-o junto com a nova senha para concluir.',
    };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
    ctx?: RequestContext,
  ): Promise<{ message: string }> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('A confirmação da nova senha deve ser idêntica à nova senha.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: normalizedEmail })
      .getOne();
    if (!user) {
      throw new NotFoundException('Não encontramos e-mail cadastrado.');
    }
    if (!this.userMayUsePasswordReset(user)) {
      throw new BadRequestException(
        'Esta conta não permite recuperação de senha no momento.',
      );
    }

    const raw = this.normalizeRecoveryCode(code);
    if (raw.length !== 8) {
      throw new BadRequestException('Código inválido ou expirado.');
    }
    const tokenHash = this.hashPasswordResetToken(raw);
    const row = await this.passwordResetTokens.findOne({
      where: { tokenHash, userId: user.id },
      relations: { user: true },
    });
    const now = new Date();
    if (!row || row.expiresAt <= now) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.users.save(user);

    await this.audit.log({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETE',
      entity: 'auth',
      entityId: String(user.id),
      metadata: {
        consumedResetTokenId: row.id,
        tokenCreatedAt: row.createdAt.toISOString(),
        tokenHadExpiredAt: row.expiresAt.toISOString(),
      },
      ctx: ctx ?? null,
    });

    await this.passwordResetTokens.delete({ userId: user.id });

    return { message: 'Senha alterada com sucesso. Faça login com a nova senha.' };
  }
}
