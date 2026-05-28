import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { EvidenceJourneyModule } from './modules/evidence-journey/evidence-journey.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { AdminNotesModule } from './modules/admin-notes/admin-notes.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ConsentTermsModule } from './modules/consent-terms/consent-terms.module';
import { AppHomeModule } from './modules/app-home/app-home.module';
import { GoogleMeetModule } from './infra/google-meet/google-meet.module';
import { CareLocationsModule } from './modules/care-locations/care-locations.module';
import { PatientAppointmentsModule } from './modules/patient-appointments/patient-appointments.module';

@Module({
  imports: [
    GoogleMeetModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host') ?? 'localhost',
          port: config.get<number>('redis.port') ?? 6379,
        },
      }),
    }),
    DatabaseModule,
    AuditModule,
    HealthModule,
    IdentityAccessModule,
    CatalogModule,
    DashboardModule,
    AdminNotesModule,
    UsersModule,
    CategoriesModule,
    ExercisesModule,
    PatientsModule,
    PrescriptionsModule,
    ReportsModule,
    NotificationsModule,
    ConsentTermsModule,
    AppHomeModule,
    CareLocationsModule,
    PatientAppointmentsModule,
    EvidenceJourneyModule,
  ],
})
export class AppModule {}
