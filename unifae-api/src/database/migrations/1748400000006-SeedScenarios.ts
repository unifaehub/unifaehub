import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed de CENÁRIOS de avaliação para demonstrar todas as situações possíveis.
 * Roda apenas se não houver salas já criadas.
 *
 * Cenários criados (para a data 2026-05-28 = hoje no desenvolvimento):
 *
 * Sala 1 — ✅ Todas as avaliações entregues (Resumo + Apresentação completos)
 * Sala 2 — ⏳ Resumo completo, Apresentação parcial (prof 2 faltando)
 * Sala 3 — ⏳ Resumo parcial (prof 1 faltando), Apresentação não iniciada
 * Sala 4 — 🔴 Nenhuma avaliação iniciada
 * Sala 5 — 🔒 Sala fechada, todas as avaliações entregues
 */
export class SeedScenarios1748400000006 implements MigrationInterface {
  name = 'SeedScenarios1748400000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Só roda se não houver salas
    const roomCount = await queryRunner.query(`SELECT COUNT(*) AS c FROM presentation_rooms`);
    if (Number(roomCount[0]?.c) > 0) return;

    // Verificar se há trabalhos aprovados
    const works = await queryRunner.query(
      `SELECT id, aluno_id, curso_trabalho FROM evidence_works WHERE status = 'Aprovado' AND deleted_at IS NULL LIMIT 5`,
    );
    if (!works.length) return;

    // Verificar professores
    const profs = await queryRunner.query(
      `SELECT id, name FROM users WHERE role = 'PROFESSOR' LIMIT 3`,
    );
    if (profs.length < 2) return;

    const dataEvento = '2026-05-28';
    const prof1 = profs[0];
    const prof2 = profs[1];
    const prof3 = profs[2] ?? profs[0]; // fallback se só 2 profs

    // Questões ativas
    const questions = await queryRunner.query(
      `SELECT id, tipo FROM dynamic_questions WHERE ativo = 1 ORDER BY tipo, ordem LIMIT 10`,
    );
    const resumoQs = questions.filter((q: any) => q.tipo === 'Resumo').slice(0, 3);
    const apresQs  = questions.filter((q: any) => q.tipo === 'Apresentação').slice(0, 3);
    if (!resumoQs.length || !apresQs.length) return;

    // ── Helper: criar sala ────────────────────────────────────────────────────
    async function createRoom(workId: number, liderId: number, fechada = false): Promise<number> {
      await queryRunner.query(
        `INSERT INTO presentation_rooms (data_evento, trabalho_id, professor_lider_id, fechada, created_at, updated_at)
         VALUES ('${dataEvento}', ${workId}, ${liderId}, ${fechada ? 1 : 0}, NOW(), NOW())`,
      );
      const [row] = await queryRunner.query(`SELECT LAST_INSERT_ID() AS id`);
      return Number(row.id);
    }

    async function addBanca(salaId: number, professorId: number) {
      await queryRunner.query(
        `INSERT INTO room_professors (sala_id, professor_id) VALUES (${salaId}, ${professorId})`,
      );
    }

    async function addEvals(
      trabalhoId: number,
      professorId: number,
      questionIds: number[],
      nota = 8,
    ) {
      for (const qid of questionIds) {
        await queryRunner.query(
          `INSERT INTO evaluations (trabalho_id, professor_id, pergunta_id, nota, status_apresentacao, created_at)
           VALUES (${trabalhoId}, ${professorId}, ${qid}, ${nota}, 'Presente', NOW())`,
        );
      }
    }

    const workIds = works.map((w: any) => w.id);

    // ── Cenário 1: Sala totalmente avaliada ───────────────────────────────────
    const s1 = await createRoom(workIds[0], prof1.id);
    await addBanca(s1, prof1.id);
    await addBanca(s1, prof2.id);
    await addEvals(workIds[0], prof1.id, [...resumoQs, ...apresQs].map((q: any) => q.id));
    await addEvals(workIds[0], prof2.id, [...resumoQs, ...apresQs].map((q: any) => q.id), 9);

    // ── Cenário 2: Resumo completo, Apresentação parcial ─────────────────────
    if (workIds[1]) {
      const s2 = await createRoom(workIds[1], prof1.id);
      await addBanca(s2, prof1.id);
      await addBanca(s2, prof2.id);
      await addEvals(workIds[1], prof1.id, resumoQs.map((q: any) => q.id));
      await addEvals(workIds[1], prof2.id, resumoQs.map((q: any) => q.id), 7);
      await addEvals(workIds[1], prof1.id, apresQs.map((q: any) => q.id)); // só prof1 avaliou apresentação
    }

    // ── Cenário 3: Resumo parcial, Apresentação não iniciada ─────────────────
    if (workIds[2]) {
      const s3 = await createRoom(workIds[2], prof2.id);
      await addBanca(s3, prof1.id);
      await addBanca(s3, prof2.id);
      await addEvals(workIds[2], prof2.id, resumoQs.map((q: any) => q.id), 6); // só prof2 avaliou resumo
    }

    // ── Cenário 4: Nenhuma avaliação iniciada ─────────────────────────────────
    if (workIds[3]) {
      const s4 = await createRoom(workIds[3], prof1.id);
      await addBanca(s4, prof1.id);
      await addBanca(s4, prof2.id);
    }

    // ── Cenário 5: Sala fechada, tudo avaliado ────────────────────────────────
    if (workIds[4]) {
      const s5 = await createRoom(workIds[4], prof3.id, true);
      await addBanca(s5, prof3.id);
      await addBanca(s5, prof1.id);
      await addEvals(workIds[4], prof3.id, [...resumoQs, ...apresQs].map((q: any) => q.id), 10);
      await addEvals(workIds[4], prof1.id, [...resumoQs, ...apresQs].map((q: any) => q.id), 9);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM evaluations WHERE created_at >= '2026-05-28'`);
    await queryRunner.query(`DELETE FROM room_professors WHERE sala_id IN (SELECT id FROM presentation_rooms WHERE data_evento = '2026-05-28')`);
    await queryRunner.query(`DELETE FROM presentation_rooms WHERE data_evento = '2026-05-28'`);
  }
}
