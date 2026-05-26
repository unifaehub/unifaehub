import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as Entities from './entities';
import { PrescriptionStatus, ExecutionStatus } from './entities/enums';

async function run() {
  const ds = new DataSource({
    type: 'mysql', host: process.env.DB_HOST ?? 'localhost', port: 3306,
    username: process.env.DB_USER ?? 'root', password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'unifae_management',
    entities: Object.values(Entities).filter(e => typeof e === 'function'),
  });
  await ds.initialize();

  const fisio: any = await ds.getRepository(Entities.CourseEntity).findOne({ where: { name: 'Fisioterapia' } });
  if (!fisio) { console.error('Fisio not found'); await ds.destroy(); return; }

  const patients: any[] = await ds.getRepository(Entities.PatientEntity).find({ where: { courseId: fisio.id } });
  if (!patients.length) { console.error('No patients in course'); await ds.destroy(); return; }

  const exercises: any[] = await ds.getRepository(Entities.ExerciseEntity).find({ take: 10 });
  if (!exercises.length) { console.error('No exercises found'); await ds.destroy(); return; }

  console.log(`Seeding evolution data for ${fisio.name}...`);
  const now = new Date();
  for (let i = 0; i < 40; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    for (const patient of patients) {
      if (Math.random() > 0.6) {
        const p = new Entities.PrescriptionEntity();
        p.patientId = patient.id;
        p.appId = fisio.appId || 1;
        p.status = Math.random() > 0.4 ? PrescriptionStatus.PENDING : PrescriptionStatus.APPROVED;
        p.createdAt = date;
        p.studentId = patient.studentId || 1;
        const pSaved = await ds.getRepository(Entities.PrescriptionEntity).save(p);

        const item = new Entities.PrescriptionItemEntity();
        item.prescriptionId = pSaved.id;
        item.exerciseId = exercises[Math.floor(Math.random() * exercises.length)].id;
        item.repetitions = '3x10';
        const itemSaved = await ds.getRepository(Entities.PrescriptionItemEntity).save(item);

        if (Math.random() > 0.4) {
          const ex = new Entities.PatientExecutionEntity();
          ex.patientId = patient.id;
          ex.prescriptionItemId = itemSaved.id;
          ex.status = ExecutionStatus.COMPLETED;
          ex.performedAt = date;
          await ds.getRepository(Entities.PatientExecutionEntity).save(ex);
        }
      }
    }
  }

  console.log('Seed completed successfully!');
  await ds.destroy();
}

run().catch(console.error);
