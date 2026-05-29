import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkResumoManual1748400000014 implements MigrationInterface {
  name = 'WorkResumoManual1748400000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols: { name: string; def: string }[] = [
      { name: 'tipo_submissao',    def: 'VARCHAR(10)  NULL AFTER integrantes'        },
      { name: 'orientador',        def: 'JSON         NULL AFTER tipo_submissao'     },
      { name: 'resumo_introducao', def: 'TEXT         NULL AFTER orientador'         },
      { name: 'resumo_objetivos',  def: 'TEXT         NULL AFTER resumo_introducao'  },
      { name: 'resumo_metodo',     def: 'TEXT         NULL AFTER resumo_objetivos'   },
      { name: 'resumo_resultados', def: 'TEXT         NULL AFTER resumo_metodo'      },
      { name: 'resumo_conclusoes', def: 'TEXT         NULL AFTER resumo_resultados'  },
      { name: 'palavras_chave',    def: 'VARCHAR(500) NULL AFTER resumo_conclusoes'  },
      { name: 'referencias',       def: 'TEXT         NULL AFTER palavras_chave'     },
    ];

    for (const col of cols) {
      const exists = await queryRunner.hasColumn('evidence_works', col.name);
      if (!exists) {
        await queryRunner.query(
          `ALTER TABLE evidence_works ADD COLUMN ${col.name} ${col.def}`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cols = [
      'tipo_submissao', 'orientador', 'resumo_introducao', 'resumo_objetivos',
      'resumo_metodo', 'resumo_resultados', 'resumo_conclusoes', 'palavras_chave', 'referencias',
    ];
    for (const col of cols) {
      const exists = await queryRunner.hasColumn('evidence_works', col);
      if (exists) {
        await queryRunner.query(`ALTER TABLE evidence_works DROP COLUMN ${col}`);
      }
    }
  }
}
