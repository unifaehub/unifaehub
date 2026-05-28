import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Seed de exemplo para o módulo Jornada de Evidências.
 * Roda apenas se os dados ainda não existirem.
 */
export class SeedJornada1748400000005 implements MigrationInterface {
  name = 'SeedJornada1748400000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hash = await bcrypt.hash('Jornada@123', 10);

    // ── 1. Jornada Config ────────────────────────────────────────────────
    const cfgCount = await queryRunner.query(`SELECT COUNT(*) AS c FROM jornada_config`);
    if (Number(cfgCount[0]?.c) === 0) {
      await queryRunner.query(`
        INSERT INTO jornada_config (evento_nome, evento_local, datas_evento)
        VALUES (
          'VIII Jornada de Evidências UniFAE 2026',
          'Campus UniFAE — Bloco A e B',
          '2026-06-10,2026-06-11,2026-06-12'
        )
      `);
    }

    // ── 2. Setores ───────────────────────────────────────────────────────
    const setorCount = await queryRunner.query(`SELECT COUNT(*) AS c FROM presentation_sectors`);
    if (Number(setorCount[0]?.c) === 0) {
      await queryRunner.query(`
        INSERT INTO presentation_sectors (nome, descricao) VALUES
          ('Setor A', 'Bloco A — Térreo e 1º andar'),
          ('Setor B', 'Bloco B — 2º andar'),
          ('Setor C', 'Bloco C — Auditório e laboratórios')
      `);
    }

    // ── 3. Salas ─────────────────────────────────────────────────────────
    const hallCount = await queryRunner.query(`SELECT COUNT(*) AS c FROM presentation_halls`);
    if (Number(hallCount[0]?.c) === 0) {
      const setores = await queryRunner.query(`SELECT id, nome FROM presentation_sectors ORDER BY id`);
      const idA = setores.find((s: any) => s.nome === 'Setor A')?.id;
      const idB = setores.find((s: any) => s.nome === 'Setor B')?.id;
      const idC = setores.find((s: any) => s.nome === 'Setor C')?.id;

      if (idA) await queryRunner.query(`
        INSERT INTO presentation_halls (nome, setor_id, andar, capacidade) VALUES
          ('Sala 1', ${idA}, 'Térreo', 30),
          ('Sala 2', ${idA}, 'Térreo', 30),
          ('Sala 3', ${idA}, '1º andar', 25),
          ('Sala 4', ${idA}, '1º andar', 25)
      `);
      if (idB) await queryRunner.query(`
        INSERT INTO presentation_halls (nome, setor_id, andar, capacidade) VALUES
          ('Sala 5', ${idB}, '2º andar', 35),
          ('Sala 6', ${idB}, '2º andar', 35),
          ('Sala 7', ${idB}, '2º andar', 30)
      `);
      if (idC) await queryRunner.query(`
        INSERT INTO presentation_halls (nome, setor_id, andar, capacidade) VALUES
          ('Auditório Principal', ${idC}, 'Térreo', 120),
          ('Lab. Informática 1',  ${idC}, '1º andar', 40),
          ('Lab. Informática 2',  ${idC}, '1º andar', 40)
      `);
    }

    // ── 4. Professores de exemplo ────────────────────────────────────────
    const profEmails = [
      'prof.ana@unifae.local',
      'prof.carlos@unifae.local',
      'prof.beatriz@unifae.local',
      'prof.daniel@unifae.local',
      'prof.elena@unifae.local',
    ];
    const existingProfs = await queryRunner.query(
      `SELECT email FROM users WHERE email IN (${profEmails.map((e) => `'${e}'`).join(',')})`,
    );
    const existingEmails = new Set(existingProfs.map((r: any) => r.email));

    const professors = [
      { name: 'Ana Paula Souza',    email: 'prof.ana@unifae.local',     rf: '100001', curso: 'Fisioterapia',         dias: '1,2,3,4,5' },
      { name: 'Carlos Eduardo Lima',email: 'prof.carlos@unifae.local',  rf: '100002', curso: 'Enfermagem',            dias: '1,3,5'     },
      { name: 'Beatriz Ferreira',   email: 'prof.beatriz@unifae.local', rf: '100003', curso: 'Medicina',              dias: '2,4'       },
      { name: 'Daniel Oliveira',    email: 'prof.daniel@unifae.local',  rf: '100004', curso: 'Nutrição',              dias: '1,2,3'     },
      { name: 'Elena Costa',        email: 'prof.elena@unifae.local',   rf: '100005', curso: 'Odontologia',           dias: '3,4,5'     },
    ];

    for (const p of professors) {
      if (!existingEmails.has(p.email)) {
        await queryRunner.query(`
          INSERT INTO users (name, email, password, role, active, registro_funcional, curso_base, dias_semana)
          VALUES ('${p.name}', '${p.email}', '${hash}', 'PROFESSOR', 1, '${p.rf}', '${p.curso}', '${p.dias}')
        `);
      }
    }

    // ── 5. Alunos de exemplo ─────────────────────────────────────────────
    const alunoEmails = [
      'aluno.joao@unifae.local',
      'aluno.maria@unifae.local',
      'aluno.pedro@unifae.local',
      'aluno.lucia@unifae.local',
      'aluno.rafael@unifae.local',
      'aluno.camila@unifae.local',
    ];
    const existingAlunos = await queryRunner.query(
      `SELECT email FROM users WHERE email IN (${alunoEmails.map((e) => `'${e}'`).join(',')})`,
    );
    const existingAlunoEmails = new Set(existingAlunos.map((r: any) => r.email));

    const alunos = [
      { name: 'João Silva',      email: 'aluno.joao@unifae.local',   ra: '2021001', curso: 'Fisioterapia'  },
      { name: 'Maria Oliveira',  email: 'aluno.maria@unifae.local',  ra: '2021002', curso: 'Fisioterapia'  },
      { name: 'Pedro Santos',    email: 'aluno.pedro@unifae.local',  ra: '2021003', curso: 'Enfermagem'    },
      { name: 'Lúcia Mendes',    email: 'aluno.lucia@unifae.local',  ra: '2021004', curso: 'Nutrição'      },
      { name: 'Rafael Pereira',  email: 'aluno.rafael@unifae.local', ra: '2021005', curso: 'Medicina'      },
      { name: 'Camila Rocha',    email: 'aluno.camila@unifae.local', ra: '2021006', curso: 'Odontologia'   },
    ];

    for (const a of alunos) {
      if (!existingAlunoEmails.has(a.email)) {
        await queryRunner.query(`
          INSERT INTO users (name, email, password, role, active, ra)
          VALUES ('${a.name}', '${a.email}', '${hash}', 'STUDENT', 1, '${a.ra}')
        `);
      }
    }

    // ── 6. Trabalhos de exemplo ──────────────────────────────────────────
    const workCount = await queryRunner.query(`SELECT COUNT(*) AS c FROM evidence_works`);
    if (Number(workCount[0]?.c) === 0) {
      const alunosRows = await queryRunner.query(
        `SELECT id, ra FROM users WHERE role = 'STUDENT' AND ra IS NOT NULL ORDER BY id LIMIT 6`,
      );

      const trabalhos = [
        { titulo: 'Impacto da fisioterapia respiratória em pacientes pós-COVID-19',      curso: 'Fisioterapia', status: 'Aprovado'   },
        { titulo: 'Efeitos da acupuntura na reabilitação de lesões esportivas',           curso: 'Fisioterapia', status: 'Aprovado'   },
        { titulo: 'Protocolo de enfermagem para prevenção de úlceras de pressão',         curso: 'Enfermagem',   status: 'Aprovado'   },
        { titulo: 'Avaliação nutricional em pacientes oncológicos: estudo de caso',       curso: 'Nutrição',     status: 'Pendente'   },
        { titulo: 'Diagnóstico precoce de diabetes tipo 2 em adultos jovens',             curso: 'Medicina',     status: 'Aprovado'   },
        { titulo: 'Aplicação de biomateriais em cirurgia periodontal minimamente invasiva',curso: 'Odontologia',  status: 'Reprovado'  },
      ];

      for (let i = 0; i < trabalhos.length; i++) {
        const t = trabalhos[i]!;
        const aluno = alunosRows[i];
        if (!aluno) continue;
        await queryRunner.query(`
          INSERT INTO evidence_works (titulo, curso_trabalho, status, aluno_id, data_submissao)
          VALUES ('${t.titulo.replace(/'/g, "''")}', '${t.curso}', '${t.status}', ${aluno.id}, NOW())
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove apenas dados de seed (seguro: não apaga dados de produção)
    await queryRunner.query(`DELETE FROM evidence_works WHERE titulo LIKE '%COVID-19%' OR titulo LIKE '%acupuntura%' OR titulo LIKE '%úlceras%' OR titulo LIKE '%oncológicos%' OR titulo LIKE '%diabetes%' OR titulo LIKE '%periodontal%'`);
    await queryRunner.query(`DELETE FROM users WHERE email LIKE 'prof.%@unifae.local' OR email LIKE 'aluno.%@unifae.local'`);
    await queryRunner.query(`DELETE FROM presentation_halls WHERE nome IN ('Sala 1','Sala 2','Sala 3','Sala 4','Sala 5','Sala 6','Sala 7','Auditório Principal','Lab. Informática 1','Lab. Informática 2')`);
    await queryRunner.query(`DELETE FROM presentation_sectors WHERE nome IN ('Setor A','Setor B','Setor C')`);
    await queryRunner.query(`DELETE FROM jornada_config WHERE evento_nome = 'VIII Jornada de Evidências UniFAE 2026'`);
  }
}
