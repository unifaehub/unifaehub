import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { PasswordResetTokenEntity } from '../../database/entities/password-reset-token.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { PatientAppointmentEntity } from '../../database/entities/patient-appointment.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { UserDeviceEntity } from '../../database/entities/user-device.entity';
import { AuditModule } from '../audit/audit.module';
import { ConsentTermsModule } from '../consent-terms/consent-terms.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AppEntity,
      UserDeviceEntity,
      PatientEntity,
      PrescriptionEntity,
      PatientAppointmentEntity,
      PasswordResetTokenEntity,
    ]),
    AuditModule,
    ConsentTermsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwt = config.get<{ secret: string; expiresIn: string }>('jwt');
        const expiresIn = jwt?.expiresIn ?? process.env.JWT_EXPIRES_IN ?? '15m';
        return {
          secret: jwt?.secret ?? process.env.JWT_SECRET ?? 'change-me',
          signOptions: {
            // @nestjs/jwt tipa expiresIn via `ms`; string runtime é suportada
            expiresIn: expiresIn as `${number}m`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailService],
  exports: [AuthService],
})
export class IdentityAccessModule {}
