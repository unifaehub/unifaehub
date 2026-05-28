import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EvidenceWorkEntity } from '../../../database/entities/evidence-work.entity';
import { parsePageLimit, toPaginated } from '../../../common/pagination';

export type RankingRow = {
  trabalhoId: number;
  titulo: string;
  cursoTrabalho: string;
  alunoNome: string;
  score: number;
};

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(EvidenceWorkEntity)
    private readonly works: Repository<EvidenceWorkEntity>,
  ) {}

  async getRanking(params: { page?: string; limit?: string }) {
    const { page, limit, skip } = parsePageLimit(params.page, params.limit, 20, 100);

    const raw: { trabalhoId: number; score: string }[] = await this.works.query(`
      SELECT
        e.trabalho_id AS trabalhoId,
        COALESCE(
          (SELECT 5 FROM room_best_works rbw WHERE rbw.trabalho_id = e.trabalho_id LIMIT 1),
          0
        ) +
        COALESCE(AVG(CASE WHEN dq.tipo = 'Apresentação' THEN e.nota END), 0) * 2 +
        COALESCE(AVG(CASE WHEN dq.tipo = 'Resumo' THEN e.nota END), 0) * 1 AS score
      FROM evaluations e
      JOIN dynamic_questions dq ON e.pergunta_id = dq.id
      WHERE e.status_apresentacao = 'Presente' AND e.nota IS NOT NULL
      GROUP BY e.trabalho_id
      ORDER BY score DESC
      LIMIT ? OFFSET ?
    `, [limit, skip]);

    const countResult: { total: string }[] = await this.works.query(`
      SELECT COUNT(DISTINCT e.trabalho_id) AS total
      FROM evaluations e
      JOIN dynamic_questions dq ON e.pergunta_id = dq.id
      WHERE e.status_apresentacao = 'Presente' AND e.nota IS NOT NULL
    `);
    const total = parseInt(countResult[0]?.total ?? '0', 10);

    const workIds = raw.map((r) => r.trabalhoId);
    if (workIds.length === 0) return toPaginated([], total, page, limit);

    const worksMap = new Map<number, EvidenceWorkEntity>();
    const workEntities = await this.works.find({ where: { id: In(workIds) }, relations: ['aluno'] });
    workEntities.forEach((w) => worksMap.set(w.id, w));

    const data: RankingRow[] = raw.map((r) => {
      const w = worksMap.get(r.trabalhoId);
      return {
        trabalhoId: r.trabalhoId,
        titulo: w?.titulo ?? '',
        cursoTrabalho: w?.cursoTrabalho ?? '',
        alunoNome: w?.aluno?.name ?? '',
        score: parseFloat(r.score),
      };
    });

    return toPaginated(data, total, page, limit);
  }
}
