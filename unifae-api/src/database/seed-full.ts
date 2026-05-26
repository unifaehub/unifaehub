/**
 * Popula TODAS as tabelas com dados de demonstração e relacionamentos válidos.
 *
 * ATENÇÃO: apaga dados existentes (TRUNCATE). Use apenas em desenvolvimento local.
 *
 *   npm run seed:full
 */
import 'dotenv/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import {
  AppEntity,
  AuditLogEntity,
  CategoryEntity,
  CategoryTypeDefinitionEntity,
  ClinicalCaseEntity,
  ConsentTermEntity,
  CourseEntity,
  CourseMenuNodeEntity,
  EventAttendanceEntity,
  EventEntity,
  ExerciseCategoryEntity,
  ExerciseEntity,
  MenuNodeEntity,
  PatientConsentAcceptanceEntity,
  PatientCareEpisodeEntity,
  PatientEntity,
  PatientExecutionEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  UserEntity,
  UserConsentAcceptanceEntity,
  MotivationalMessageEntity,
} from './entities';
import {
  CareEpisodeStatus,
  EventAttendanceStatus,
  ExecutionStatus,
  PrescriptionStatus,
  UserRole,
} from './entities/enums';

const entities = [
  AppEntity,
  CourseEntity,
  CourseMenuNodeEntity,
  MenuNodeEntity,
  UserEntity,
  ClinicalCaseEntity,
  CategoryTypeDefinitionEntity,
  CategoryEntity,
  ExerciseEntity,
  ExerciseCategoryEntity,
  PatientCareEpisodeEntity,
  PatientEntity,
  PrescriptionEntity,
  PrescriptionItemEntity,
  PatientExecutionEntity,
  ConsentTermEntity,
  PatientConsentAcceptanceEntity,
  UserConsentAcceptanceEntity,
  AuditLogEntity,
  EventEntity,
  EventAttendanceEntity,
  MotivationalMessageEntity,
];

/** Apps e cursos oficiais UNIFAE Hub (cadastros prévios; um curso pode existir sem app no futuro). */
const UNIFAE_APP_COURSE_PAIRS: Array<{ appName: string; courseName: string }> = [
  { appName: 'Unifae Care - Fisioterapia', courseName: 'Fisioterapia' },
  { appName: 'Unifae Life - Medicina', courseName: 'Medicina' },
  { appName: 'Unifae Move - Educação Física', courseName: 'Educação Física' },
  { appName: 'Unifae Smile - Odontologia', courseName: 'Odontologia' },
  { appName: 'Unifae Business - Administração', courseName: 'Administração' },
  { appName: 'Unifae Finance - Ciências Contábeis', courseName: 'Ciências Contábeis' },
  { appName: 'Unifae Law - Direito', courseName: 'Direito' },
  { appName: 'Unifae Assist - Enfermagem', courseName: 'Enfermagem' },
  { appName: 'Unifae Tech - Engenharia de Software', courseName: 'Engenharia de Software' },
  { appName: 'Unifae Engine - Engenharia Mecânica', courseName: 'Engenharia Mecânica' },
  { appName: 'Unifae Lab - Farmácia', courseName: 'Farmácia' },
  { appName: 'Unifae Learning - Pedagogia', courseName: 'Pedagogia' },
  { appName: 'Unifae Mind - Psicologia', courseName: 'Psicologia' },
  { appName: 'Unifae Creative - Publicidade e Propaganda', courseName: 'Publicidade e Propaganda' },
];

/** Rótulo na UI para agrupamentos de classificação (`clinical_cases`) por curso. */
function caseContextLabelForCourse(courseName: string): string | null {
  if (courseName === 'Direito') return 'Cenário jurídico';
  const clinicalLike = new Set([
    'Fisioterapia',
    'Medicina',
    'Enfermagem',
    'Odontologia',
    'Psicologia',
    'Farmácia',
  ]);
  if (clinicalLike.has(courseName)) return 'Caso clínico';
  return 'Contexto de classificação';
}

const TRUNCATE_ORDER = [
  'event_attendances',
  'events',
  'patient_executions',
  'prescription_items',
  'prescriptions',
  'patient_care_episodes',
  'patient_consent_acceptances',
  'user_consent_acceptances',
  'patients',
  'consent_terms',
  'exercise_categories',
  'exercises',
  'categories',
  'category_type_definitions',
  'clinical_cases',
  'audit_logs',
  'notifications',
  'users',
  'course_menu_nodes',
  'menu_nodes',
  'courses',
  'apps',
];

async function seedMenuCatalog(ds: DataSource) {
  const menuNodes = ds.getRepository(MenuNodeEntity);
  await menuNodes.save(
    menuNodes.create({
      parentId: null,
      key: 'overview',
      label: 'Visão geral',
      icon: 'school',
      routeName: 'course-hub',
      includeInNewCourses: true,
    }),
  );
  await menuNodes.save([
    menuNodes.create({
      parentId: null,
      key: 'patients',
      label: 'Pacientes',
      icon: 'personal_injury',
      routeName: null,
      includeInNewCourses: true,
    }),
    menuNodes.create({
      parentId: null,
      key: 'exercises',
      label: 'Exercícios',
      icon: 'fitness_center',
      routeName: null,
      includeInNewCourses: true,
    }),
    menuNodes.create({
      parentId: null,
      key: 'prescriptions',
      label: 'Prescrições',
      icon: 'medical_services',
      routeName: null,
      includeInNewCourses: true,
    }),
    menuNodes.create({
      parentId: null,
      key: 'approvals',
      label: 'Aprovações',
      icon: 'verified',
      routeName: null,
      includeInNewCourses: true,
    }),
    menuNodes.create({
      parentId: null,
      key: 'patient-history',
      label: 'História do paciente',
      icon: 'auto_stories',
      routeName: null,
      includeInNewCourses: false,
    }),
    menuNodes.create({
      parentId: null,
      key: 'library',
      label: 'Biblioteca de arquivos',
      icon: 'folder',
      routeName: null,
      includeInNewCourses: false,
    }),
    menuNodes.create({
      parentId: null,
      key: 'care-locations',
      label: 'Locais de atendimento',
      icon: 'location_on',
      routeName: null,
      includeInNewCourses: false,
    }),
    menuNodes.create({
      parentId: null,
      key: 'appointments',
      label: 'Agenda',
      icon: 'event',
      routeName: null,
      includeInNewCourses: false,
    }),
  ]);
  const exercises = await menuNodes.findOne({ where: { key: 'exercises' } });
  if (exercises) {
    await menuNodes.save(
      menuNodes.create({
        parentId: exercises.id,
        key: 'demo-teste',
        label: 'TESTE',
        icon: 'science',
        routeName: null,
        includeInNewCourses: false,
      }),
    );
  }
}

async function seedCourseMenuLinks(
  ds: DataSource,
  courseByName: Map<string, { id: number; appId: number | null }>,
) {
  const menuNodes = ds.getRepository(MenuNodeEntity);
  const cm = ds.getRepository(CourseMenuNodeEntity);
  async function nid(key: string) {
    const n = await menuNodes.findOne({ where: { key } });
    if (!n) throw new Error(`Seed: menu_nodes.key=${key} não encontrado.`);
    return n.id;
  }
  const ids = {
    overview: await nid('overview'),
    patients: await nid('patients'),
    exercises: await nid('exercises'),
    prescriptions: await nid('prescriptions'),
    approvals: await nid('approvals'),
    patientHistory: await nid('patient-history'),
    library: await nid('library'),
    demoTeste: await nid('demo-teste'),
    careLocations: await nid('care-locations'),
    appointments: await nid('appointments'),
  };
  for (const [name, { id: courseId }] of courseByName) {
    const add = (menuNodeId: number, sortOrder: number) =>
      cm.save(cm.create({ courseId, menuNodeId, enabled: true, sortOrder }));

    if (name === 'Educação Física') {
      await add(ids.overview, 0);
      await add(ids.exercises, 10);
    } else if (name === 'Fisioterapia') {
      await add(ids.overview, 0);
      await add(ids.patients, 10);
      await add(ids.exercises, 20);
      await add(ids.demoTeste, 25);
      await add(ids.patientHistory, 27);
      await add(ids.prescriptions, 30);
      await add(ids.approvals, 40);
      await add(ids.appointments, 45);
    } else {
      await add(ids.overview, 0);
      if (name.includes('Publicidade')) {
        await add(ids.library, 50);
      }
    }
  }
}

async function run() {
  const pwd =
    process.env.SEED_DEMO_PASSWORD ??
    process.env.SEED_ADMIN_PASSWORD ??
    'Admin@123';
  const hash = await bcrypt.hash(pwd, 10);

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

  console.log('Limpando tabelas (TRUNCATE)…');
  await ds.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TRUNCATE_ORDER) {
    await ds.query(`TRUNCATE TABLE \`${table}\``);
  }
  await ds.query('SET FOREIGN_KEY_CHECKS = 1');

  const apps = ds.getRepository(AppEntity);
  const courses = ds.getRepository(CourseEntity);
  const users = ds.getRepository(UserEntity);
  const categories = ds.getRepository(CategoryEntity);
  const exercises = ds.getRepository(ExerciseEntity);
  const exerciseCategories = ds.getRepository(ExerciseCategoryEntity);
  const patients = ds.getRepository(PatientEntity);
  const patientCareEpisodes = ds.getRepository(PatientCareEpisodeEntity);
  const prescriptions = ds.getRepository(PrescriptionEntity);
  const prescriptionItems = ds.getRepository(PrescriptionItemEntity);
  const executions = ds.getRepository(PatientExecutionEntity);
  const motivationalMessages = ds.getRepository(MotivationalMessageEntity);
  const consentTerms = ds.getRepository(ConsentTermEntity);
  const consentAccept = ds.getRepository(PatientConsentAcceptanceEntity);
  const userConsentAccept = ds.getRepository(UserConsentAcceptanceEntity);
  const auditLogs = ds.getRepository(AuditLogEntity);
  const events = ds.getRepository(EventEntity);
  const eventAtt = ds.getRepository(EventAttendanceEntity);

  const courseByName = new Map<string, { id: number; appId: number | null }>();
  let appCare: { id: number; name: string } | null = null;

  console.log('Catálogo de menus (nós e submenus)…');
  await seedMenuCatalog(ds);

  for (const row of UNIFAE_APP_COURSE_PAIRS) {
    const appRow = await apps.save(apps.create({ name: row.appName, active: true }));
    if (row.courseName === 'Fisioterapia') appCare = appRow;
    const c = await courses.save(
      courses.create({
        name: row.courseName,
        appId: appRow.id,
        active: true,
        caseContextLabel: caseContextLabelForCourse(row.courseName),
      }),
    );
    courseByName.set(row.courseName, { id: c.id, appId: appRow.id });
  }

  console.log('Menus por curso (relação N cursos ↔ nós)…');
  await seedCourseMenuLinks(ds, courseByName);

  const courseFisioId = courseByName.get('Fisioterapia')?.id;
  const appCareId = appCare?.id ?? courseByName.get('Fisioterapia')?.appId;
  if (!courseFisioId || !appCareId) {
    throw new Error('Seed: curso Fisioterapia não encontrado após catálogo UNIFAE.');
  }
  const courseFisio = await courses.findOneOrFail({ where: { id: courseFisioId } });

  const uAdmin = await users.save(
    users.create({
      name: 'Administrador Sistema',
      email: 'admin@unifae.local',
      password: hash,
      role: UserRole.ADMIN,
      appId: appCareId,
      courseId: null,
    }),
  );
  const uCoord = await users.save(
    users.create({
      name: 'Coord. Ana Silva',
      email: 'coordenador@unifae.local',
      password: hash,
      role: UserRole.COORDINATOR,
      appId: appCareId,
      courseId: courseFisio.id,
    }),
  );
  const uProf = await users.save(
    users.create({
      name: 'Prof. Dr. Ricardo Mendes',
      email: 'professor@unifae.local',
      password: hash,
      role: UserRole.PROFESSOR,
      appId: appCareId,
      courseId: courseFisio.id,
    }),
  );
  const uStudent = await users.save(
    users.create({
      name: 'Aluno André Lucas',
      email: 'aluno@unifae.local',
      password: hash,
      role: UserRole.STUDENT,
      appId: appCareId,
      courseId: courseFisio.id,
    }),
  );
  const uPatient1 = await users.save(
    users.create({
      name: 'Maria Aparecida Souza',
      email: 'paciente1@unifae.local',
      password: hash,
      role: UserRole.PATIENT,
      appId: appCareId,
      courseId: courseFisio.id,
    }),
  );
  const uPatient2 = await users.save(
    users.create({
      name: 'João Pedro Alcântara',
      email: 'paciente2@unifae.local',
      password: hash,
      role: UserRole.PATIENT,
      appId: appCareId,
      courseId: courseFisio.id,
    }),
  );

  const typeDefs = ds.getRepository(CategoryTypeDefinitionEntity);
  const tdEixo = await typeDefs.save(
    typeDefs.create({
      courseId: courseFisio.id,
      key: 'eixo',
      label: 'Eixo',
      description: 'Linha de cuidado / especialidade (ex.: Ortopedia).',
      sortOrder: 0,
    }),
  );
  const tdProblema = await typeDefs.save(
    typeDefs.create({
      courseId: courseFisio.id,
      key: 'problema',
      label: 'Problema / quadro clínico',
      description: null,
      sortOrder: 10,
    }),
  );
  const tdObjetivo = await typeDefs.save(
    typeDefs.create({
      courseId: courseFisio.id,
      key: 'objetivo',
      label: 'Objetivo terapêutico',
      description: null,
      sortOrder: 20,
    }),
  );
  const tdNivel = await typeDefs.save(
    typeDefs.create({
      courseId: courseFisio.id,
      key: 'nivel',
      label: 'Nível / progressão',
      description: null,
      sortOrder: 30,
    }),
  );

  const clinicalCases = ds.getRepository(ClinicalCaseEntity);
  const casoFisioDemo = await clinicalCases.save(
    clinicalCases.create({
      name: 'Caso clínico — Ortopedia',
      description:
        'Hierarquia exemplo: Ortopedia → Lombalgia → Ganho de amplitude → Iniciante / Intermediário / Avançado (último nível: vínculo de exercícios ao paciente).',
      courseId: courseFisio.id,
      appId: appCareId,
    }),
  );

  const catOrtopedia = await categories.save(
    categories.create({
      name: 'Ortopedia',
      categoryTypeDefinitionId: tdEixo.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoFisioDemo.id,
      parentId: null,
      sortOrder: 0,
      isLeafLevel: false,
    }),
  );
  const catLombalgia = await categories.save(
    categories.create({
      name: 'Lombalgia',
      categoryTypeDefinitionId: tdProblema.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoFisioDemo.id,
      parentId: catOrtopedia.id,
      sortOrder: 0,
      isLeafLevel: false,
    }),
  );
  const catMob = await categories.save(
    categories.create({
      name: 'Ganho de amplitude',
      categoryTypeDefinitionId: tdObjetivo.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoFisioDemo.id,
      parentId: catLombalgia.id,
      sortOrder: 0,
      isLeafLevel: false,
    }),
  );
  const catNivelIni = await categories.save(
    categories.create({
      name: 'Iniciante',
      categoryTypeDefinitionId: tdNivel.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoFisioDemo.id,
      parentId: catMob.id,
      sortOrder: 0,
      isLeafLevel: true,
    }),
  );
  const catNivelInt = await categories.save(
    categories.create({
      name: 'Intermediário',
      categoryTypeDefinitionId: tdNivel.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoFisioDemo.id,
      parentId: catMob.id,
      sortOrder: 10,
      isLeafLevel: true,
    }),
  );
  const catNivelAv = await categories.save(
    categories.create({
      name: 'Avançado',
      categoryTypeDefinitionId: tdNivel.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoFisioDemo.id,
      parentId: catMob.id,
      sortOrder: 20,
      isLeafLevel: true,
    }),
  );

  const exAgachamento = await exercises.save(
    exercises.create({
      name: 'Agachamento assistido',
      description: 'Fortalecimento MMII com supervisão.',
      instructions: 'Manter joelhos alinhados ao médio pé.',
      videoUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      createdById: uProf.id,
      courseId: courseFisio.id,
      appId: appCareId,
      active: true,
    }),
  );
  const exPrancha = await exercises.save(
    exercises.create({
      name: 'Prancha isométrica',
      description: 'Estabilização do core.',
      instructions: 'Corpo alinhado, evitar hiperslordose.',
      createdById: uProf.id,
      courseId: courseFisio.id,
      appId: appCareId,
      active: true,
    }),
  );
  const exAlongamento = await exercises.save(
    exercises.create({
      name: 'Alongamento posterior de coxa',
      description: 'Flexibilidade isquiotibiais.',
      instructions: 'Manter por 30s cada lado.',
      createdById: uProf.id,
      courseId: courseFisio.id,
      appId: appCareId,
      active: true,
    }),
  );

  /** Exercícios vinculados apenas a categorias de último nível (folhas). */
  await exerciseCategories.save([
    exerciseCategories.create({
      exerciseId: exAgachamento.id,
      categoryId: catNivelIni.id,
    }),
    exerciseCategories.create({
      exerciseId: exPrancha.id,
      categoryId: catNivelIni.id,
    }),
    exerciseCategories.create({
      exerciseId: exPrancha.id,
      categoryId: catNivelAv.id,
    }),
    exerciseCategories.create({
      exerciseId: exAlongamento.id,
      categoryId: catNivelInt.id,
    }),
  ]);

  const casoAtm = await clinicalCases.save(
    clinicalCases.create({
      name: 'Caso clínico — Tratamento de ATM',
      description:
        'Exemplo completo: ATM → quadro clínico → objetivo terapêutico → Iniciante / Intermediário / Avançado (nível final para vínculo de exercícios).',
      courseId: courseFisio.id,
      appId: appCareId,
    }),
  );

  const catAtmRaiz = await categories.save(
    categories.create({
      name: 'ATM',
      categoryTypeDefinitionId: tdEixo.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoAtm.id,
      parentId: null,
      sortOrder: 0,
      isLeafLevel: false,
    }),
  );
  const catAtmQuadro = await categories.save(
    categories.create({
      name: 'Dor e limitação de abertura',
      categoryTypeDefinitionId: tdProblema.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoAtm.id,
      parentId: catAtmRaiz.id,
      sortOrder: 0,
      isLeafLevel: false,
    }),
  );
  const catAtmObj = await categories.save(
    categories.create({
      name: 'Relaxamento e controle motor',
      categoryTypeDefinitionId: tdObjetivo.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoAtm.id,
      parentId: catAtmQuadro.id,
      sortOrder: 0,
      isLeafLevel: false,
    }),
  );
  const catAtmIni = await categories.save(
    categories.create({
      name: 'Iniciante',
      categoryTypeDefinitionId: tdNivel.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoAtm.id,
      parentId: catAtmObj.id,
      sortOrder: 0,
      isLeafLevel: true,
    }),
  );
  const catAtmInt = await categories.save(
    categories.create({
      name: 'Intermediário',
      categoryTypeDefinitionId: tdNivel.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoAtm.id,
      parentId: catAtmObj.id,
      sortOrder: 10,
      isLeafLevel: true,
    }),
  );
  const catAtmAv = await categories.save(
    categories.create({
      name: 'Avançado',
      categoryTypeDefinitionId: tdNivel.id,
      courseId: courseFisio.id,
      appId: appCareId,
      clinicalCaseId: casoAtm.id,
      parentId: catAtmObj.id,
      sortOrder: 20,
      isLeafLevel: true,
    }),
  );

  const exAtmRelax = await exercises.save(
    exercises.create({
      name: 'Relaxamento supra-hióideo',
      description: 'Consciência e soltura da musculatura mastigadora.',
      instructions: 'Toque leve nos músculos, boca levemente entreaberta, respiração calma.',
      createdById: uProf.id,
      courseId: courseFisio.id,
      appId: appCareId,
      active: true,
    }),
  );
  await exerciseCategories.save([
    exerciseCategories.create({
      exerciseId: exAtmRelax.id,
      categoryId: catAtmIni.id,
    }),
  ]);

  const p1 = await patients.save(
    patients.create({
      userId: uPatient1.id,
      studentId: uStudent.id,
      professorId: uProf.id,
      courseId: courseFisio.id,
      appId: appCareId,
    }),
  );
  const p2 = await patients.save(
    patients.create({
      userId: uPatient2.id,
      studentId: uStudent.id,
      professorId: uProf.id,
      courseId: courseFisio.id,
      appId: appCareId,
    }),
  );

  const epP1Active = await patientCareEpisodes.save(
    patientCareEpisodes.create({
      patientId: p1.id,
      title: 'Lombalgia — fase aguda',
      description: null,
      clinicalCaseId: null,
      status: CareEpisodeStatus.ACTIVE,
      startedAt: new Date(Date.UTC(2026, 3, 1)),
      endedAt: null,
    }),
  );
  await patientCareEpisodes.save(
    patientCareEpisodes.create({
      patientId: p1.id,
      title: 'Condicionamento geral',
      description: null,
      clinicalCaseId: null,
      status: CareEpisodeStatus.RESOLVED,
      startedAt: new Date(Date.UTC(2026, 0, 10)),
      endedAt: new Date(Date.UTC(2026, 1, 28)),
    }),
  );
  const epP2Default = await patientCareEpisodes.save(
    patientCareEpisodes.create({
      patientId: p2.id,
      title: 'Acompanhamento geral',
      description: null,
      clinicalCaseId: null,
      status: CareEpisodeStatus.ACTIVE,
      startedAt: new Date(Date.UTC(2026, 3, 1)),
      endedAt: null,
    }),
  );

  const prPending = await prescriptions.save(
    prescriptions.create({
      patientId: p1.id,
      studentId: uStudent.id,
      professorId: uProf.id,
      status: PrescriptionStatus.PENDING,
      justification: 'Fortalecimento MMII com foco em estabilidade — aguardando revisão.',
      nextVisitDate: null,
      appId: appCareId,
      careEpisodeId: epP1Active.id,
    }),
  );
  const prApproved = await prescriptions.save(
    prescriptions.create({
      patientId: p1.id,
      studentId: uStudent.id,
      professorId: uProf.id,
      status: PrescriptionStatus.APPROVED,
      justification: 'Protocolo adequado ao caso clínico.',
      nextVisitDate: new Date('2026-05-15T10:00:00'),
      appId: appCareId,
      careEpisodeId: epP1Active.id,
      decidedAt: new Date('2026-04-05T14:30:00.000Z'),
      decidedById: uProf.id,
    }),
  );
  const prRejected = await prescriptions.save(
    prescriptions.create({
      patientId: p2.id,
      studentId: uStudent.id,
      professorId: uProf.id,
      status: PrescriptionStatus.REJECTED,
      justification: 'Volume excessivo para fase aguda — revisar cargas.',
      nextVisitDate: null,
      appId: appCareId,
      careEpisodeId: epP2Default.id,
      decidedAt: new Date('2026-04-06T10:00:00.000Z'),
      decidedById: uProf.id,
    }),
  );

  await prescriptionItems.save(
    prescriptionItems.create({
      prescriptionId: prPending.id,
      exerciseId: exAgachamento.id,
      instructions: '3 séries de 10 repetições',
      repetitions: '10',
      notes: 'Sem dor à flexão',
    }),
  );
  await prescriptionItems.save(
    prescriptionItems.create({
      prescriptionId: prPending.id,
      exerciseId: exPrancha.id,
      instructions: '3x 30s',
      repetitions: '30s',
      notes: null,
    }),
  );
  const itemApproved1 = await prescriptionItems.save(
    prescriptionItems.create({
      prescriptionId: prApproved.id,
      exerciseId: exAlongamento.id,
      instructions: 'Diário',
      repetitions: '30s/lado',
      notes: null,
    }),
  );
  await prescriptionItems.save(
    prescriptionItems.create({
      prescriptionId: prApproved.id,
      exerciseId: exPrancha.id,
      instructions: 'Isometria',
      repetitions: '3x20s',
      notes: null,
    }),
  );
  await prescriptionItems.save(
    prescriptionItems.create({
      prescriptionId: prRejected.id,
      exerciseId: exAgachamento.id,
      instructions: 'Carga reduzida (rejeitado para revisão)',
      repetitions: '6',
      notes: 'Professor solicitou replanejamento',
    }),
  );

  // Execuções distribuídas no tempo para alimentar o gráfico de evolução no dashboard.
  const now = new Date();
  const series: PatientExecutionEntity[] = [];
  for (let i = 14; i >= 1; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(9, 0, 0, 0);
    series.push(
      executions.create({
        patientId: p1.id,
        prescriptionItemId: itemApproved1.id,
        performedAt: day,
        feedback: i % 3 === 0 ? 'Leve desconforto.' : 'Sem queixas.',
        status: i % 4 === 0 ? ExecutionStatus.PARTIAL : ExecutionStatus.COMPLETED,
      }),
    );
  }
  await executions.save(series);

  // Mensagens motivacionais (Home do app)
  await motivationalMessages.save([
    motivationalMessages.create({ message: 'Um passo de cada vez: hoje já é progresso.', active: true }),
    motivationalMessages.create({ message: 'Seu esforço de hoje é a sua melhora de amanhã.', active: true }),
    motivationalMessages.create({ message: 'Respire. Ajuste a postura. Continue.', active: true }),
    motivationalMessages.create({ message: 'Consistência vale mais do que intensidade.', active: true }),
  ]);

  const termNow = new Date();
  const termV1 = await consentTerms.save(
    consentTerms.create({
      title: 'Termo de tratamento (demonstração)',
      content:
        '<p>Termo de consentimento para tratamento fisioterapêutico (versão demonstração).</p>',
      version: '1.0',
      active: true,
      createdById: uAdmin.id,
      updatedById: uAdmin.id,
      updatedAt: termNow,
      courseId: courseFisio.id,
      appId: appCareId,
    }),
  );
  await consentTerms.save(
    consentTerms.create({
      title: null,
      content: '<p>Versão anterior arquivada.</p>',
      version: '0.9',
      active: false,
      createdById: uAdmin.id,
      updatedById: uAdmin.id,
      updatedAt: termNow,
      courseId: courseFisio.id,
      appId: appCareId,
    }),
  );

  const hashDoc = randomBytes(16).toString('hex');
  const userConsentContentHash = createHash('sha256').update(termV1.content, 'utf8').digest('hex');
  await consentAccept.save([
    consentAccept.create({
      patientId: p1.id,
      consentTermId: termV1.id,
      acceptedAt: new Date('2026-03-01T14:00:00'),
      ip: '127.0.0.1',
      userAgent: 'UNIFAE-Care/1.0',
      documentHash: hashDoc,
      appId: appCareId,
    }),
    consentAccept.create({
      patientId: p2.id,
      consentTermId: termV1.id,
      acceptedAt: new Date('2026-03-10T11:20:00'),
      ip: '127.0.0.1',
      userAgent: 'UNIFAE-Care/1.0',
      documentHash: hashDoc,
      appId: appCareId,
    }),
  ]);

  await userConsentAccept.save([
    userConsentAccept.create({
      userId: uPatient1.id,
      consentTermId: termV1.id,
      courseId: courseFisio.id,
      acceptedAt: new Date('2026-03-01T14:00:00'),
      ipAddress: '127.0.0.1',
      userAgent: 'UNIFAE-Care/1.0',
      contentHash: userConsentContentHash,
    }),
    userConsentAccept.create({
      userId: uPatient2.id,
      consentTermId: termV1.id,
      courseId: courseFisio.id,
      acceptedAt: new Date('2026-03-10T11:20:00'),
      ipAddress: '127.0.0.1',
      userAgent: 'UNIFAE-Care/1.0',
      contentHash: userConsentContentHash,
    }),
  ]);

  const ev = await events.save(
    events.create({
      title: 'Workshop: reabilitação lombar',
      description: 'Encontro presencial — laboratório de movimento.',
      startsAt: new Date('2026-06-10T14:00:00'),
      endsAt: new Date('2026-06-10T17:00:00'),
      courseId: courseFisio.id,
      appId: appCareId,
      location: 'Campus UNIFAE — Sala 12',
      active: true,
    }),
  );

  const qr1 = randomBytes(48).toString('hex').slice(0, 128);
  await eventAtt.save([
    eventAtt.create({
      eventId: ev.id,
      userId: uStudent.id,
      status: EventAttendanceStatus.CONFIRMED,
      qrToken: qr1,
      confirmedAt: new Date('2026-04-01T10:00:00'),
    }),
    eventAtt.create({
      eventId: ev.id,
      userId: uProf.id,
      status: EventAttendanceStatus.CONFIRMED,
      qrToken: randomBytes(48).toString('hex').slice(0, 128),
      confirmedAt: new Date('2026-04-01T10:05:00'),
    }),
  ]);

  await auditLogs.save([
    auditLogs.create({
      userId: uAdmin.id,
      action: 'CREATE',
      entity: 'Course',
      entityId: String(courseFisio.id),
      metadata: { name: 'Fisioterapia' },
    }),
    auditLogs.create({
      userId: uCoord.id,
      action: 'UPDATE',
      entity: 'Prescription',
      entityId: String(prApproved.id),
      metadata: { status: PrescriptionStatus.APPROVED },
    }),
    auditLogs.create({
      userId: null,
      action: 'LOGIN_FAILED',
      entity: 'Auth',
      entityId: '0',
      metadata: { reason: 'demo_row' },
    }),
  ]);

  console.log('');
  console.log('Seed completo aplicado.');
  console.log(
    'Apps:',
    UNIFAE_APP_COURSE_PAIRS.length,
    '| Cursos:',
    UNIFAE_APP_COURSE_PAIRS.length,
    '| Usuários:',
    7,
  );
  console.log('Senha de todos os usuários demo:', pwd);
  console.log('E-mails: admin@, coordenador@, professor@, aluno@, paciente1@, paciente2@ (domínio unifae.local)');
  console.log('Prescrições:', 3, '| Itens:', 4, '| Execuções (série demo):', 14);
  console.log('');

  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
