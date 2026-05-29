import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class MoreProfessors1748400000011 implements MigrationInterface {
  name = 'MoreProfessors1748400000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hash = await bcrypt.hash('Jornada@123', 10);

    const professors = [
      { name: 'Alexandre Rocha',    email: 'prof.alexandre@unifae.local',  rf: '100011', curso: 'Fisioterapia',             dias: '1,2,3,4,5' },
      { name: 'Beatriz Cunha',      email: 'prof.beatriz@unifae.local',    rf: '100012', curso: 'Medicina',                  dias: '1,3,5'     },
      { name: 'Carlos Menezes',     email: 'prof.carlos.m@unifae.local',   rf: '100013', curso: 'Nutrição',                  dias: '2,4'       },
      { name: 'Daniela Ferreira',   email: 'prof.daniela@unifae.local',    rf: '100014', curso: 'Psicologia',                dias: '1,2,3'     },
      { name: 'Eduardo Pinto',      email: 'prof.eduardo@unifae.local',    rf: '100015', curso: 'Odontologia',               dias: '3,4,5'     },
      { name: 'Fernanda Lopes',     email: 'prof.fernanda@unifae.local',   rf: '100016', curso: 'Biomedicina',               dias: '1,2,4,5'   },
      { name: 'Gustavo Nunes',      email: 'prof.gustavo@unifae.local',    rf: '100017', curso: 'Ciência da Computação',     dias: '1,3,4'     },
      { name: 'Helena Carvalho',    email: 'prof.helena@unifae.local',     rf: '100018', curso: 'Sistemas de Informação',    dias: '2,3,5'     },
      { name: 'Igor Santana',       email: 'prof.igor@unifae.local',       rf: '100019', curso: 'Engenharia de Software',    dias: '1,2,5'     },
      { name: 'Juliana Moreira',    email: 'prof.juliana@unifae.local',    rf: '100020', curso: 'Administração',             dias: '1,2,3,4,5' },
      { name: 'Klaus Werner',       email: 'prof.klaus@unifae.local',      rf: '100021', curso: 'Engenharia Civil',          dias: '3,5'       },
      { name: 'Larissa Teixeira',   email: 'prof.larissa@unifae.local',    rf: '100022', curso: 'Arquitetura',               dias: '1,4,5'     },
      { name: 'Marcelo Vieira',     email: 'prof.marcelo@unifae.local',    rf: '100023', curso: 'Direito',                   dias: '2,3,4'     },
      { name: 'Natália Correia',    email: 'prof.natalia@unifae.local',    rf: '100024', curso: 'Pedagogia',                 dias: '1,2,3,5'   },
      { name: 'Osvaldo Machado',    email: 'prof.osvaldo@unifae.local',    rf: '100025', curso: 'Medicina',                  dias: '4,5'       },
      { name: 'Patrícia Lima',      email: 'prof.patricia@unifae.local',   rf: '100026', curso: 'Enfermagem',                dias: '1,3,4,5'   },
      { name: 'Rafael Brandão',     email: 'prof.rafael@unifae.local',     rf: '100027', curso: 'Farmácia',                  dias: '2,4,5'     },
      { name: 'Simone Castro',      email: 'prof.simone@unifae.local',     rf: '100028', curso: 'Fisioterapia',              dias: '1,2,3'     },
      { name: 'Thiago Barbosa',     email: 'prof.thiago@unifae.local',     rf: '100029', curso: 'Ciência da Computação',     dias: '1,2,3,4'   },
      { name: 'Ursula Mendes',      email: 'prof.ursula@unifae.local',     rf: '100030', curso: 'Biomedicina',               dias: '3,4,5'     },
    ];

    for (const p of professors) {
      const exists = await queryRunner.query(
        `SELECT id FROM users WHERE email = '${p.email}' LIMIT 1`,
      );
      if (!exists.length) {
        await queryRunner.query(`
          INSERT INTO users (name, email, password, role, active, registro_funcional, curso_base, dias_semana)
          VALUES (
            '${p.name}', '${p.email}', '${hash}',
            'PROFESSOR', 1, '${p.rf}', '${p.curso}', '${p.dias}'
          )
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emails = [
      'prof.alexandre@unifae.local', 'prof.beatriz@unifae.local',
      'prof.carlos.m@unifae.local',  'prof.daniela@unifae.local',
      'prof.eduardo@unifae.local',   'prof.fernanda@unifae.local',
      'prof.gustavo@unifae.local',   'prof.helena@unifae.local',
      'prof.igor@unifae.local',      'prof.juliana@unifae.local',
      'prof.klaus@unifae.local',     'prof.larissa@unifae.local',
      'prof.marcelo@unifae.local',   'prof.natalia@unifae.local',
      'prof.osvaldo@unifae.local',   'prof.patricia@unifae.local',
      'prof.rafael@unifae.local',    'prof.simone@unifae.local',
      'prof.thiago@unifae.local',    'prof.ursula@unifae.local',
    ];
    const list = emails.map((e) => `'${e}'`).join(',');
    await queryRunner.query(`DELETE FROM users WHERE email IN (${list})`);
  }
}
