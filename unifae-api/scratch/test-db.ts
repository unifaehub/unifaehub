import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as Entities from '../src/database/entities';

async function run() {
  const ds = new DataSource({
    type: 'mysql', host: process.env.DB_HOST ?? 'localhost', port: 3306,
    username: process.env.DB_USER ?? 'root', password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'unifae_management',
    entities: Object.values(Entities).filter(e => typeof e === 'function'),
  });
  await ds.initialize();

  const fisio = await ds.getRepository(Entities.CourseEntity).findOne({ where: { name: 'Fisioterapia' } });
  if (!fisio) { console.log('Fisio not found'); await ds.destroy(); return; }

  const res = await ds.getRepository(Entities.PrescriptionEntity)
    .createQueryBuilder('p')
    .innerJoin(Entities.PatientEntity, 'pt', 'pt.id = p.patientId')
    .select('DATE(p.createdAt)', 'd')
    .addSelect('COUNT(*)', 'cnt')
    .where('pt.courseId = :cid', { cid: fisio.id })
    .groupBy('d')
    .getRawMany();

  console.log('Fisio Prescriptions:', res);

  const execs = await ds.getRepository(Entities.PatientExecutionEntity)
    .createQueryBuilder('e')
    .innerJoin(Entities.PatientEntity, 'pt', 'pt.id = e.patientId')
    .select('DATE(e.performedAt)', 'd')
    .addSelect('COUNT(*)', 'cnt')
    .where('pt.courseId = :cid', { cid: fisio.id })
    .groupBy('d')
    .getRawMany();

  console.log('Fisio Executions:', execs);

  await ds.destroy();
}
run();
