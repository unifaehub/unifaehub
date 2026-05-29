import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { EvidenceWorkEntity } from '../../../database/entities/evidence-work.entity';
import { EvidenceWorkStatus, WorkCategory, WorkType } from '../../../database/entities/enums';
import { UserEntity } from '../../../database/entities/user.entity';
import { RoomBestWorkEntity } from '../../../database/entities/room-best-work.entity';
import { parsePageLimit, toPaginated } from '../../../common/pagination';
import { CreateWorkDto } from '../dto/create-work.dto';
import { ModerateWorksDto } from '../dto/moderate-works.dto';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { EvidenceWorkDocxService } from './evidence-work-docx.service';

type UploadedMulterFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

@Injectable()
export class WorksService {
  constructor(
    @InjectRepository(EvidenceWorkEntity)
    private readonly works: Repository<EvidenceWorkEntity>,
    @InjectRepository(RoomBestWorkEntity)
    private readonly bestWorks: Repository<RoomBestWorkEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly config: ConfigService,
    private readonly docxGen: EvidenceWorkDocxService,
  ) {}

  async list(params: {
    page?: string;
    limit?: string;
    status?: string;
    q?: string;
  }) {
    const { page, limit, skip } = parsePageLimit(params.page, params.limit, 20, 100);
    const qb = this.works
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.aluno', 'a')
      .where('w.deletedAt IS NULL')
      .orderBy('w.dataSubmissao', 'DESC');

    if (params.status) {
      qb.andWhere('w.status = :status', { status: params.status });
    }
    if (params.q?.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(w.titulo) LIKE :q OR LOWER(w.cursoTrabalho) LIKE :q OR LOWER(a.name) LIKE :q)',
        { q },
      );
    }

    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();
    return toPaginated(data, total, page, limit);
  }

  async findOne(id: number): Promise<EvidenceWorkEntity> {
    const work = await this.works.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['aluno'],
    });
    if (!work) throw new NotFoundException('Trabalho não encontrado.');
    return work;
  }

  async create(
    dto: CreateWorkDto,
    currentUser: UserEntity,
    file?: UploadedMulterFile,
  ): Promise<EvidenceWorkEntity> {
    const alunoId = dto.alunoId ?? currentUser.id;
    const arquivoUrl = file ? this.saveFile(file, alunoId) : null;

    const work = this.works.create({
      titulo: dto.titulo,
      cursoTrabalho: dto.cursoTrabalho,
      arquivoUrl,
      status: EvidenceWorkStatus.PENDENTE,
      dataSubmissao: new Date(),
      alunoId,
    });
    return this.works.save(work);
  }

  async resubmit(
    alunoId: number,
    dto: CreateWorkDto,
    file?: UploadedMulterFile,
  ): Promise<EvidenceWorkEntity> {
    const existingActive = await this.works.findOne({
      where: { alunoId, deletedAt: IsNull() },
      order: { dataSubmissao: 'DESC' },
    });

    if (
      existingActive &&
      existingActive.status !== EvidenceWorkStatus.REPROVADO &&
      existingActive.status !== EvidenceWorkStatus.INATIVO
    ) {
      throw new BadRequestException(
        'Você já possui um trabalho ativo. Aguarde a moderação ou solicite a exclusão.',
      );
    }

    const arquivoUrl = file ? this.saveFile(file, alunoId) : null;
    const work = this.works.create({
      titulo: dto.titulo,
      cursoTrabalho: dto.cursoTrabalho,
      arquivoUrl,
      status: EvidenceWorkStatus.PENDENTE,
      dataSubmissao: new Date(),
      alunoId,
    });
    return this.works.save(work);
  }

  async moderate(dto: ModerateWorksDto): Promise<{ updated: number }> {
    const result = await this.works.update(
      { id: In(dto.ids), deletedAt: IsNull() },
      { status: dto.status },
    );
    return { updated: result.affected ?? 0 };
  }

  async softDelete(id: number): Promise<void> {
    const work = await this.findOne(id);
    work.status = EvidenceWorkStatus.INATIVO;
    work.deletedAt = new Date();
    await this.works.save(work);
  }

  async getStats() {
    const all = await this.works.find({ where: { deletedAt: IsNull() } });

    const total      = all.length;
    const aprovados  = all.filter((w) => w.status === EvidenceWorkStatus.APROVADO).length;
    const reprovados = all.filter((w) => w.status === EvidenceWorkStatus.REPROVADO).length;
    const pendentes  = all.filter((w) => w.status === EvidenceWorkStatus.PENDENTE).length;
    const inativos   = all.filter((w) => w.status === EvidenceWorkStatus.INATIVO).length;

    // Agrupar por curso
    const cursoMap = new Map<string, { total: number; aprovados: number; reprovados: number; pendentes: number }>();
    for (const w of all) {
      const c = w.cursoTrabalho ?? 'Não informado';
      if (!cursoMap.has(c)) cursoMap.set(c, { total: 0, aprovados: 0, reprovados: 0, pendentes: 0 });
      const entry = cursoMap.get(c)!;
      entry.total++;
      if (w.status === EvidenceWorkStatus.APROVADO)  entry.aprovados++;
      if (w.status === EvidenceWorkStatus.REPROVADO) entry.reprovados++;
      if (w.status === EvidenceWorkStatus.PENDENTE)  entry.pendentes++;
    }
    const porCurso = [...cursoMap.entries()]
      .map(([curso, s]) => ({ curso, ...s }))
      .sort((a, b) => b.total - a.total);

    // Destaques pós-evento por curso
    const bests = await this.bestWorks.find({ relations: ['trabalho'] });
    const destaquesMap = new Map<string, number>();
    for (const b of bests) {
      const c = b.trabalho?.cursoTrabalho ?? 'Não informado';
      destaquesMap.set(c, (destaquesMap.get(c) ?? 0) + 1);
    }
    const destaquesPorCurso = [...destaquesMap.entries()]
      .map(([curso, destaques]) => ({ curso, destaques }))
      .sort((a, b) => b.destaques - a.destaques);

    return { total, aprovados, reprovados, pendentes, inativos, porCurso, destaquesPorCurso };
  }

  /**
   * Submissão pública sem login.
   * `ras` é um array de RAs dos integrantes do grupo — o primeiro é o responsável principal.
   * `tipoSubmissao` determina o modo: 'manual' (gera docx) ou 'arquivo' (upload direto).
   */
  async publicSubmit(
    dto: {
      ras: string[];
      titulo: string;
      cursoTrabalho: string;
      categoria: string;
      tipoTrabalho?: string;
      tipoSubmissao?: 'manual' | 'arquivo';
      orientadorNome?: string;
      orientadorEmail?: string;
      resumoIntroducao?: string;
      resumoObjetivos?: string;
      resumoMetodo?: string;
      resumoResultados?: string;
      resumoConclusoes?: string;
      palavrasChave?: string;
      referencias?: string;
    },
    file?: UploadedMulterFile,
  ) {
    if (!dto.ras?.length) throw new BadRequestException('Informe ao menos um RA.');

    const tipoSubmissao = dto.tipoSubmissao ?? 'arquivo';

    if (tipoSubmissao === 'manual') {
      if (!dto.resumoIntroducao?.trim()) throw new BadRequestException('Introdução é obrigatória.');
      if (!dto.resumoObjetivos?.trim())  throw new BadRequestException('Objetivos são obrigatórios.');
      if (!dto.resumoMetodo?.trim())     throw new BadRequestException('Método é obrigatório.');
      if (!dto.resumoResultados?.trim()) throw new BadRequestException('Resultados são obrigatórios.');
      if (!dto.resumoConclusoes?.trim()) throw new BadRequestException('Conclusões são obrigatórias.');
      if (!dto.palavrasChave?.trim())    throw new BadRequestException('Palavras-chave são obrigatórias.');
    }

    const primaryRa = dto.ras[0]!.trim();
    const primary = await this.users.findOne({ where: { ra: primaryRa, deletedAt: IsNull() } });
    if (!primary) throw new NotFoundException(`Aluno não encontrado para o RA ${primaryRa}.`);

    // Resolve integrantes adicionais
    const extras: { ra: string; nome: string; email?: string }[] = [];
    for (const ra of dto.ras.slice(1)) {
      const trimmed = ra.trim();
      if (!trimmed) continue;
      const u = await this.users.findOne({ where: { ra: trimmed, deletedAt: IsNull() } });
      if (!u) throw new NotFoundException(`Aluno não encontrado para o RA ${trimmed}.`);
      extras.push({ ra: trimmed, nome: u.name, email: u.email ?? undefined });
    }

    const existing = await this.works.findOne({
      where: { alunoId: primary.id, deletedAt: IsNull() },
      order: { dataSubmissao: 'DESC' },
    });

    if (
      existing &&
      existing.status !== EvidenceWorkStatus.REPROVADO &&
      existing.status !== EvidenceWorkStatus.INATIVO
    ) {
      throw new BadRequestException(
        'Você já possui um trabalho ativo. Aguarde a análise ou entre em contato com a coordenação.',
      );
    }

    let arquivoUrl: string | null = null;
    if (tipoSubmissao === 'arquivo' && file) {
      arquivoUrl = this.saveFile(file, primary.id);
    } else if (tipoSubmissao === 'manual') {
      const orientador =
        dto.orientadorNome?.trim()
          ? { nome: dto.orientadorNome.trim(), email: dto.orientadorEmail?.trim() ?? '' }
          : null;

      const autores = [
        { nome: primary.name, email: primary.email ?? undefined },
        ...extras,
      ];

      const referencias = (dto.referencias ?? '')
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      const buffer = await this.docxGen.generate({
        titulo:        dto.titulo,
        autores,
        orientador,
        cursoTrabalho: dto.cursoTrabalho,
        resumo: {
          introducao: dto.resumoIntroducao!,
          objetivos:  dto.resumoObjetivos!,
          metodo:     dto.resumoMetodo!,
          resultados: dto.resumoResultados!,
          conclusoes: dto.resumoConclusoes!,
        },
        palavrasChave: dto.palavrasChave!,
        referencias,
      });

      arquivoUrl = this.saveBuffer(buffer, primary.id, 'resumo.docx');
    }

    const orientadorSaved =
      dto.orientadorNome?.trim()
        ? { nome: dto.orientadorNome.trim(), email: dto.orientadorEmail?.trim() ?? '' }
        : null;

    const work = this.works.create({
      titulo:            dto.titulo,
      cursoTrabalho:     dto.cursoTrabalho,
      categoria:         (dto.categoria as WorkCategory) ?? WorkCategory.JORNADA_EVIDENCIAS,
      tipoTrabalho:      (dto.tipoTrabalho as WorkType) ?? null,
      arquivoUrl,
      status:            EvidenceWorkStatus.PENDENTE,
      dataSubmissao:     new Date(),
      alunoId:           primary.id,
      integrantes:       extras.length ? extras : null,
      tipoSubmissao,
      orientador:        orientadorSaved,
      resumoIntroducao:  dto.resumoIntroducao?.trim() ?? null,
      resumoObjetivos:   dto.resumoObjetivos?.trim()  ?? null,
      resumoMetodo:      dto.resumoMetodo?.trim()     ?? null,
      resumoResultados:  dto.resumoResultados?.trim() ?? null,
      resumoConclusoes:  dto.resumoConclusoes?.trim() ?? null,
      palavrasChave:     dto.palavrasChave?.trim()    ?? null,
      referencias:       dto.referencias?.trim()      ?? null,
    });
    const saved = await this.works.save(work);
    return { ...saved, alunoNome: primary.name };
  }

  /** Consulta pública do trabalho de um aluno pelo RA. */
  async publicFindByRa(ra: string) {
    const student = await this.users.findOne({ where: { ra } });
    if (!student) return null;
    const work = await this.works.findOne({
      where: { alunoId: student.id, deletedAt: IsNull() },
      order: { dataSubmissao: 'DESC' },
    });
    if (!work) return null;
    return { ...work, alunoNome: student.name };
  }

  private saveBuffer(buffer: Buffer, alunoId: number, filename: string): string {
    const uploadRoot =
      this.config.get<{ root: string }>('uploads')?.root ?? 'uploads';
    const dir = path.join(uploadRoot, 'evidence-works', String(alunoId));
    fs.mkdirSync(dir, { recursive: true });
    const fname = `${Date.now()}-${filename}`;
    const filePath = path.join(dir, fname);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  private saveFile(file: UploadedMulterFile, alunoId: number): string {
    const uploadRoot =
      this.config.get<{ root: string }>('uploads')?.root ?? 'uploads';
    const dir = path.join(uploadRoot, 'evidence-works', String(alunoId));
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, file.buffer);
    return filePath;
  }
}
