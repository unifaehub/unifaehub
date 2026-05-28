import { MigrationInterface, QueryRunner, TableColumn, Table, TableForeignKey } from 'typeorm';

export class JornadaConfigAndDias1748400000004 implements MigrationInterface {
  name = 'JornadaConfigAndDias1748400000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // dias_semana on users
    const hasCol = await queryRunner.hasColumn('users', 'dias_semana');
    if (!hasCol) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({ name: 'dias_semana', type: 'text', isNullable: true }),
      );
    }

    // jornada_config table
    const hasCfg = await queryRunner.hasTable('jornada_config');
    if (!hasCfg) {
      await queryRunner.createTable(
        new Table({
          name: 'jornada_config',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'evento_nome', type: 'varchar', length: '200', isNullable: true },
            { name: 'evento_local', type: 'varchar', length: '500', isNullable: true },
            { name: 'datas_evento', type: 'text', isNullable: true },
            { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );
    }

    // presentation_sectors table
    const hasSectors = await queryRunner.hasTable('presentation_sectors');
    if (!hasSectors) {
      await queryRunner.createTable(
        new Table({
          name: 'presentation_sectors',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'nome', type: 'varchar', length: '100' },
            { name: 'descricao', type: 'varchar', length: '500', isNullable: true },
            { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );
    }

    // presentation_halls table
    // Nota: NÃO criar índice explícito em setor_id — o MySQL cria automaticamente
    // ao adicionar a FK constraint, e tentar recriar causaria erro.
    const hasHalls = await queryRunner.hasTable('presentation_halls');
    if (!hasHalls) {
      await queryRunner.createTable(
        new Table({
          name: 'presentation_halls',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'nome', type: 'varchar', length: '100' },
            { name: 'setor_id', type: 'int' },
            { name: 'andar', type: 'varchar', length: '50', isNullable: true },
            { name: 'capacidade', type: 'int', isNullable: true },
            { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'presentation_halls',
        new TableForeignKey({
          columnNames: ['setor_id'],
          referencedTableName: 'presentation_sectors',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      // Índice em setor_id é criado automaticamente pelo MySQL junto com a FK acima.
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasHalls = await queryRunner.hasTable('presentation_halls');
    if (hasHalls) await queryRunner.dropTable('presentation_halls', true);

    const hasSectors = await queryRunner.hasTable('presentation_sectors');
    if (hasSectors) await queryRunner.dropTable('presentation_sectors', true);

    const hasCfg = await queryRunner.hasTable('jornada_config');
    if (hasCfg) await queryRunner.dropTable('jornada_config', true);

    const hasCol = await queryRunner.hasColumn('users', 'dias_semana');
    if (hasCol) await queryRunner.dropColumn('users', 'dias_semana');
  }
}
