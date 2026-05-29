import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntercursoConfigEntity } from '../../database/entities/intercurso-config.entity';
import { IntercursoModalidadeEntity } from '../../database/entities/intercurso-modalidade.entity';
import { IntercursoEquipeEntity } from '../../database/entities/intercurso-equipe.entity';
import { IntercursoResultadoEntity } from '../../database/entities/intercurso-resultado.entity';
import { IntercursoKeywordEntity } from '../../database/entities/intercurso-keyword.entity';
import { IntercursoConfigService } from './services/intercurso-config.service';
import { ModalidadesService } from './services/modalidades.service';
import { EquipesService } from './services/equipes.service';
import { ResultadosService } from './services/resultados.service';
import { IntercursoKeywordService } from './services/intercurso-keyword.service';
import { IntercursoConfigController } from './controllers/intercurso-config.controller';
import { ModalidadesController } from './controllers/modalidades.controller';
import { EquipesController } from './controllers/equipes.controller';
import { ResultadosController } from './controllers/resultados.controller';
import { IntercursoKeywordController } from './controllers/intercurso-keyword.controller';
import { PublicIntercursoController } from './controllers/public-intercurso.controller';
import { IdentityAccessModule } from '../identity-access/identity-access.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntercursoConfigEntity,
      IntercursoModalidadeEntity,
      IntercursoEquipeEntity,
      IntercursoResultadoEntity,
      IntercursoKeywordEntity,
    ]),
    IdentityAccessModule,
    AuditModule,
  ],
  controllers: [
    IntercursoConfigController,
    ModalidadesController,
    EquipesController,
    ResultadosController,
    IntercursoKeywordController,
    PublicIntercursoController,
  ],
  providers: [
    IntercursoConfigService,
    ModalidadesService,
    EquipesService,
    ResultadosService,
    IntercursoKeywordService,
  ],
})
export class IntercursoModule {}
