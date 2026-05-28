import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiRoles1748400000002 implements MigrationInterface {
  name = 'MultiRoles1748400000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna extra_roles para suporte a múltiplos papéis por usuário
    if (!(await queryRunner.hasColumn('users', 'extra_roles'))) {
      await queryRunner.query(`ALTER TABLE \`users\` ADD COLUMN \`extra_roles\` TEXT NULL`);
    }

    // Atualizar o ENUM da coluna role para incluir MASTER e ADMIN_JORNADA
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY COLUMN \`role\` ENUM('MASTER','ADMIN','ADMIN_JORNADA','COORDINATOR','PROFESSOR','STUDENT','PATIENT') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`extra_roles\``);
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY COLUMN \`role\` ENUM('ADMIN','COORDINATOR','PROFESSOR','STUDENT','PATIENT') NOT NULL
    `);
  }
}
