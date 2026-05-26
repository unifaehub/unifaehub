import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import {
  AppEntity,
  AuditLogEntity,
  CategoryEntity,
  ConsentTermEntity,
  CourseEntity,
  EventAttendanceEntity,
  EventEntity,
  ExerciseCategoryEntity,
  ExerciseEntity,
  PatientConsentAcceptanceEntity,
  PatientEntity,
  PatientExecutionEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  UserEntity,
} from './entities';
import { UserRole } from './entities/enums';

const entities = [
  AppEntity,
  CourseEntity,
  UserEntity,
  CategoryEntity,
  ExerciseEntity,
  ExerciseCategoryEntity,
  PatientEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  PatientExecutionEntity,
  ConsentTermEntity,
  PatientConsentAcceptanceEntity,
  AuditLogEntity,
  EventEntity,
  EventAttendanceEntity,
];

async function run() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'unifae_management',
    entities,
    synchronize: process.env.TYPEORM_SYNC === 'true',
  });
  await ds.initialize();
  const users = ds.getRepository(UserEntity);
  const apps = ds.getRepository(AppEntity);
  const courses = ds.getRepository(CourseEntity);

  const email = (
    process.env.SEED_ADMIN_EMAIL ?? 'admin@unifae.local'
  ).toLowerCase();
  const plain = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';

  let app = await apps.findOne({ where: { name: 'UNIFAE Care' } });
  if (!app) {
    app = await apps.save(apps.create({ name: 'UNIFAE Care', active: true }));
    console.log('App UNIFAE Care criado, id=', app.id);
  }

  let course = await courses.findOne({
    where: { name: 'Fisioterapia', appId: app.id },
  });
  if (!course) {
    course = await courses.save(
      courses.create({
        name: 'Fisioterapia',
        appId: app.id,
        active: true,
        caseContextLabel: 'Caso clínico',
      }),
    );
    console.log('Curso Fisioterapia criado, id=', course.id);
  }

  const existing = await users.findOne({ where: { email } });
  if (existing) {
    console.log('Admin já existe:', email);
    await ds.destroy();
    return;
  }

  const hash = await bcrypt.hash(plain, 10);
  await users.save(
    users.create({
      name: 'Administrador',
      email,
      password: hash,
      role: UserRole.ADMIN,
      appId: app.id,
      courseId: null,
    }),
  );
  console.log('Usuário admin criado:', email);
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
