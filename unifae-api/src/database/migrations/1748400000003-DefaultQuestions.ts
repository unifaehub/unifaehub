import { MigrationInterface, QueryRunner } from 'typeorm';

export class DefaultQuestions1748400000003 implements MigrationInterface {
  name = 'DefaultQuestions1748400000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM \`dynamic_questions\``);
    if (Number(existing[0]?.cnt) > 0) return;

    const questions: { texto: string; tipo: string; ordem: number }[] = [
      // ── Resumo ────────────────────────────────────────────────────────────
      { texto: 'Clareza e objetividade do resumo', tipo: 'Resumo', ordem: 1 },
      { texto: 'Relevância e originalidade do tema', tipo: 'Resumo', ordem: 2 },
      { texto: 'Embasamento teórico e referências bibliográficas', tipo: 'Resumo', ordem: 3 },
      { texto: 'Adequação da metodologia utilizada', tipo: 'Resumo', ordem: 4 },
      { texto: 'Consistência dos resultados e conclusões', tipo: 'Resumo', ordem: 5 },

      // ── Apresentação ──────────────────────────────────────────────────────
      { texto: 'Clareza e objetividade na apresentação oral', tipo: 'Apresentação', ordem: 1 },
      { texto: 'Domínio do conteúdo apresentado', tipo: 'Apresentação', ordem: 2 },
      { texto: 'Organização e estrutura da apresentação', tipo: 'Apresentação', ordem: 3 },
      { texto: 'Qualidade dos recursos visuais utilizados', tipo: 'Apresentação', ordem: 4 },
      { texto: 'Capacidade de responder às perguntas da banca', tipo: 'Apresentação', ordem: 5 },
    ];

    for (const q of questions) {
      await queryRunner.query(
        `INSERT INTO \`dynamic_questions\` (\`texto_pergunta\`, \`tipo\`, \`ordem\`, \`ativo\`) VALUES (?, ?, ?, 1)`,
        [q.texto, q.tipo, q.ordem],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`dynamic_questions\` WHERE \`ativo\` = 1`);
  }
}
