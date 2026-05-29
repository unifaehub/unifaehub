import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class WorkCategoryAndFullSeed1748400000007 implements MigrationInterface {
  name = 'WorkCategoryAndFullSeed1748400000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Adicionar campos categoria e tipo_trabalho em evidence_works ──────
    const hasCat = await queryRunner.hasColumn('evidence_works', 'categoria');
    if (!hasCat) {
      await queryRunner.query(`
        ALTER TABLE evidence_works
          ADD COLUMN categoria ENUM('Jornada de Evidências','Mostra de Jogos')
            NOT NULL DEFAULT 'Jornada de Evidências' AFTER curso_trabalho,
          ADD COLUMN tipo_trabalho ENUM('Pesquisa','TCC','Iniciação Científica','Desenvolvimento Prático')
            NULL AFTER categoria
      `);
    }

    const hash = await bcrypt.hash('Jornada@123', 10);

    // ── 2. Professores adicionais (Engenharia de Software para Mostra de Jogos) ─
    const newProfs = [
      { name: 'Fernando Gomes',     email: 'prof.fernando@unifae.local', rf: '100006', curso: 'Engenharia de Software', dias: '1,2,3,4,5' },
      { name: 'Gabriela Martins',   email: 'prof.gabriela@unifae.local', rf: '100007', curso: 'Engenharia de Software', dias: '1,3,5'     },
      { name: 'Henrique Castro',    email: 'prof.henrique@unifae.local', rf: '100008', curso: 'Ciência da Computação',  dias: '2,4'       },
      { name: 'Isabela Ramos',      email: 'prof.isabela@unifae.local',  rf: '100009', curso: 'Sistemas de Informação', dias: '1,2,4,5'  },
      { name: 'João Pedro Alves',   email: 'prof.joao@unifae.local',     rf: '100010', curso: 'Fisioterapia',           dias: '1,3,4'    },
    ];
    for (const p of newProfs) {
      const exists = await queryRunner.query(`SELECT id FROM users WHERE email = '${p.email}' LIMIT 1`);
      if (!exists.length) {
        await queryRunner.query(`
          INSERT INTO users (name, email, password, role, active, registro_funcional, curso_base, dias_semana)
          VALUES ('${p.name}','${p.email}','${hash}','PROFESSOR',1,'${p.rf}','${p.curso}','${p.dias}')
        `);
      }
    }

    // ── 3. Alunos adicionais ──────────────────────────────────────────────────
    const newAlunos = [
      { name: 'Amanda Souza',     email: 'aluno.amanda@unifae.local',   ra: '2021007', curso: 'Engenharia de Software' },
      { name: 'Bruno Lima',       email: 'aluno.bruno@unifae.local',    ra: '2021008', curso: 'Engenharia de Software' },
      { name: 'Carolina Neves',   email: 'aluno.carolina@unifae.local', ra: '2021009', curso: 'Engenharia de Software' },
      { name: 'Diego Fernandes',  email: 'aluno.diego@unifae.local',    ra: '2021010', curso: 'Fisioterapia'           },
      { name: 'Eduarda Torres',   email: 'aluno.eduarda@unifae.local',  ra: '2021011', curso: 'Medicina'               },
      { name: 'Felipe Cardoso',   email: 'aluno.felipe@unifae.local',   ra: '2021012', curso: 'Ciência da Computação'  },
    ];
    for (const a of newAlunos) {
      const exists = await queryRunner.query(`SELECT id FROM users WHERE email = '${a.email}' LIMIT 1`);
      if (!exists.length) {
        await queryRunner.query(`
          INSERT INTO users (name, email, password, role, active, ra)
          VALUES ('${a.name}','${a.email}','${hash}','STUDENT',1,'${a.ra}')
        `);
      }
    }

    // ── 4. Trabalhos adicionais ───────────────────────────────────────────────
    const workCount = await queryRunner.query(`SELECT COUNT(*) AS c FROM evidence_works`);
    if (Number(workCount[0]?.c) < 10) {
      const alunos = await queryRunner.query(`SELECT id, email FROM users WHERE role = 'STUDENT' ORDER BY id`);
      const emailMap: Record<string, number> = {};
      alunos.forEach((a: any) => { emailMap[a.email] = a.id; });

      const newWorks = [
        // Jornada de Evidências
        { titulo: 'Efeitos do pilates na reabilitação pós-AVC', curso: 'Fisioterapia', cat: 'Jornada de Evidências', tipo: 'Pesquisa', email: 'aluno.diego@unifae.local', status: 'Aprovado' },
        { titulo: 'Diagnóstico por IA de retinopatia diabética', curso: 'Medicina', cat: 'Jornada de Evidências', tipo: 'Iniciação Científica', email: 'aluno.eduarda@unifae.local', status: 'Aprovado' },
        // Mostra de Jogos
        { titulo: 'EcoQuest — jogo educativo sobre sustentabilidade', curso: 'Engenharia de Software', cat: 'Mostra de Jogos', tipo: null, email: 'aluno.amanda@unifae.local', status: 'Aprovado' },
        { titulo: 'NeuroGame — estimulação cognitiva para idosos', curso: 'Engenharia de Software', cat: 'Mostra de Jogos', tipo: null, email: 'aluno.bruno@unifae.local', status: 'Aprovado' },
        { titulo: 'CityBuilder — simulação urbana com dados reais', curso: 'Ciência da Computação', cat: 'Mostra de Jogos', tipo: null, email: 'aluno.felipe@unifae.local', status: 'Pendente' },
        { titulo: 'Desenvolvimento de aplicativo de telemedicina', curso: 'Engenharia de Software', cat: 'Jornada de Evidências', tipo: 'Desenvolvimento Prático', email: 'aluno.carolina@unifae.local', status: 'Aprovado' },
      ];

      for (const w of newWorks) {
        const alunoId = emailMap[w.email];
        if (!alunoId) continue;
        const tipoSql = w.tipo ? `'${w.tipo}'` : 'NULL';
        await queryRunner.query(`
          INSERT INTO evidence_works (titulo, curso_trabalho, categoria, tipo_trabalho, status, aluno_id, data_submissao)
          VALUES ('${w.titulo.replace(/'/g, "''")}','${w.curso}','${w.cat}',${tipoSql},'${w.status}',${alunoId},NOW())
        `);
      }

      // Atualizar obras existentes com categorias padrão
      await queryRunner.query(`
        UPDATE evidence_works SET categoria = 'Jornada de Evidências', tipo_trabalho = 'Pesquisa'
        WHERE categoria IS NULL OR categoria = ''
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCat = await queryRunner.hasColumn('evidence_works', 'categoria');
    if (hasCat) {
      await queryRunner.query(`ALTER TABLE evidence_works DROP COLUMN tipo_trabalho, DROP COLUMN categoria`);
    }
    await queryRunner.query(`DELETE FROM users WHERE email LIKE 'prof.fernando@%' OR email LIKE 'prof.gabriela@%' OR email LIKE 'prof.henrique@%' OR email LIKE 'prof.isabela@%' OR email LIKE 'prof.joao@%'`);
    await queryRunner.query(`DELETE FROM users WHERE email IN ('aluno.amanda@unifae.local','aluno.bruno@unifae.local','aluno.carolina@unifae.local','aluno.diego@unifae.local','aluno.eduarda@unifae.local','aluno.felipe@unifae.local')`);
  }
}
