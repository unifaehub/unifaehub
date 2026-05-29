import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IntercursoConfigService } from '../services/intercurso-config.service';
import { ModalidadesService } from '../services/modalidades.service';
import { EquipesService } from '../services/equipes.service';
import { ResultadosService } from '../services/resultados.service';
import { IntercursoKeywordService } from '../services/intercurso-keyword.service';
import { IntercursoEquipeStatus } from '../../../database/entities/enums';

/**
 * Endpoints públicos consumidos pelo app mobile do Intercurso.
 * Sem autenticação — dados somente leitura.
 */
@ApiTags('Intercurso — Público')
@Controller('intercurso/public')
export class PublicIntercursoController {
  constructor(
    private readonly configService:   IntercursoConfigService,
    private readonly modalidades:     ModalidadesService,
    private readonly equipes:         EquipesService,
    private readonly resultados:      ResultadosService,
    private readonly keywords:        IntercursoKeywordService,
  ) {}

  /** Informações gerais do evento. */
  @Get('evento')
  getEvento() {
    return this.configService.get();
  }

  /** Modalidades ativas com equipes aprovadas e resultados. */
  @Get('programa')
  async getPrograma() {
    const mods = await this.modalidades.listAtivas();

    const programa = await Promise.all(
      mods.map(async (m) => {
        const { items: equipesAtivas } = await this.equipes.list({
          modalidadeId: String(m.id),
          status: IntercursoEquipeStatus.APROVADA,
          limit: '500',
        });
        const res = await this.resultados.listByModalidade(m.id);

        return {
          id:         m.id,
          nome:       m.nome,
          descricao:  m.descricao,
          maxMembros: m.maxMembros,
          ordem:      m.ordem,
          equipes:    equipesAtivas.map((e) => ({
            id:                 e.id,
            nome:               e.nome,
            cursoRepresentante: e.cursoRepresentante,
            membros:            e.membros,
          })),
          resultados: res.map((r) => ({
            equipeId:  r.equipeId,
            equipe:    r.equipe ? { nome: r.equipe.nome, curso: r.equipe.cursoRepresentante } : null,
            posicao:   r.posicao,
            pontuacao: r.pontuacao,
          })),
        };
      }),
    );

    return programa;
  }

  /** Palavra-chave atual para certificados (mesma lógica da Jornada). */
  @Get('keywords/current')
  getCurrentKeyword() {
    return this.keywords.getCurrentKeyword();
  }
}
