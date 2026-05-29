import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { EvidenceWorkEntity } from '../../../database/entities/evidence-work.entity';
import { CourseEntity } from '../../../database/entities/course.entity';
import { EvidenceWorkStatus, UserRole, WorkCategory, WorkType } from '../../../database/entities/enums';
import { UserEntity } from '../../../database/entities/user.entity';
import { RoomBestWorkEntity } from '../../../database/entities/room-best-work.entity';
import { parsePageLimit, toPaginated } from '../../../common/pagination';
import { CreateWorkDto } from '../dto/create-work.dto';
import { ModerateWorksDto } from '../dto/moderate-works.dto';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { EvidenceWorkDocxService } from './evidence-work-docx.service';
import { JornadaConfigService } from './jornada-config.service';
import { EvidenceJourneyMailService } from './evidence-journey-mail.service';

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
    @InjectRepository(CourseEntity)
    private readonly courses: Repository<CourseEntity>,
    private readonly config: ConfigService,
    private readonly docxGen: EvidenceWorkDocxService,
    private readonly configService: JornadaConfigService,
    private readonly mailer: EvidenceJourneyMailService,
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
    const updates: { status: EvidenceWorkStatus; motivo?: string | null } = { status: dto.status };
    const motivo = dto.motivo?.trim() ?? null;
    if (dto.status === EvidenceWorkStatus.REPROVADO && motivo) {
      updates.motivo = motivo;
    } else if (dto.status === EvidenceWorkStatus.APROVADO) {
      updates.motivo = null;
    }

    // Busca works antes de atualizar para montar os emails
    const worksToNotify = await this.works.find({
      where: { id: In(dto.ids), deletedAt: IsNull() },
      relations: ['aluno'],
    });

    const result = await this.works.update(
      { id: In(dto.ids), deletedAt: IsNull() },
      updates,
    );

    // Envia emails em background (não bloqueia a resposta)
    this.sendModerationEmails(worksToNotify, dto.status, motivo).catch(() => {});

    return { updated: result.affected ?? 0 };
  }

  private async sendModerationEmails(
    works: EvidenceWorkEntity[],
    status: EvidenceWorkStatus,
    motivo: string | null,
  ): Promise<void> {
    for (const work of works) {
      const emails = await this.buildWorkEmails(work);
      const data = this.buildWorkEmailData(work);
      if (status === EvidenceWorkStatus.APROVADO) {
        await this.mailer.notifyApproval(data, emails.recipients);
      } else if (status === EvidenceWorkStatus.REPROVADO && motivo) {
        await this.mailer.notifyRejection(data, emails.recipients, motivo);
      }
    }
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
      orientador?: string;
      coorientadores?: string;
      resumoIntroducao?: string;
      resumoObjetivos?: string;
      resumoMetodo?: string;
      resumoResultados?: string;
      resumoConclusoes?: string;
      resumoSecoes?: string;
      palavrasChave?: string;
      referencias?: string;
    },
    file?: UploadedMulterFile,
    apresentacaoFile?: UploadedMulterFile,
  ) {
    if (!dto.ras?.length) throw new BadRequestException('Informe ao menos um RA.');

    const tipoSubmissao = dto.tipoSubmissao ?? 'arquivo';

    // Validate submission period
    const pubConfig = await this.configService.getPublicConfig();
    if (!pubConfig.submissaoAberta) {
      throw new BadRequestException('O período de submissão de trabalhos não está aberto.');
    }

    // Parse dynamic sections
    let parsedSecoes: { secao: string; conteudo: string }[] = [];
    try { parsedSecoes = dto.resumoSecoes ? JSON.parse(dto.resumoSecoes) : []; } catch { /* ignore */ }

    // If no resumoSecoes provided, build from old fixed fields for backward compat
    if (!parsedSecoes.length && tipoSubmissao === 'manual') {
      const cfgSecoes = pubConfig.secoesResumo;
      const oldFieldMap: Record<string, string | undefined> = {
        'Introdução': dto.resumoIntroducao,
        'Objetivos':  dto.resumoObjetivos,
        'Método':     dto.resumoMetodo,
        'Resultados': dto.resumoResultados,
        'Conclusões': dto.resumoConclusoes,
      };
      parsedSecoes = cfgSecoes
        .map((s) => ({ secao: s.titulo, conteudo: oldFieldMap[s.titulo]?.trim() ?? '' }))
        .filter((s) => s.conteudo);
    }

    if (tipoSubmissao === 'manual') {
      if (!dto.palavrasChave?.trim()) throw new BadRequestException('Palavras-chave são obrigatórias.');
      // Validate required sections
      const cfgSecoes = pubConfig.secoesResumo;
      for (const s of cfgSecoes.filter((s) => s.obrigatorio)) {
        const found = parsedSecoes.find((p) => p.secao === s.titulo);
        if (!found?.conteudo?.trim()) {
          throw new BadRequestException(`Seção "${s.titulo}" é obrigatória.`);
        }
      }
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

    // Parse orientador e coorientadores (enviados como JSON string via FormData)
    type OrientadorPayload = { professorId?: number; nome: string; email: string };
    type CoorientadorPayload = { tipo: 'interno' | 'externo'; professorId?: number; nome: string; email: string };

    let orientadorParsed: OrientadorPayload | null = null;
    try { orientadorParsed = dto.orientador ? JSON.parse(dto.orientador) : null; } catch { /* ignore */ }

    let coorientadoresParsed: CoorientadorPayload[] = [];
    try { coorientadoresParsed = dto.coorientadores ? JSON.parse(dto.coorientadores) : []; } catch { /* ignore */ }

    let arquivoUrl: string | null = null;
    if (tipoSubmissao === 'arquivo' && file) {
      arquivoUrl = this.saveFile(file, primary.id);
    } else if (tipoSubmissao === 'manual') {
      const autores = [
        { nome: primary.name, email: primary.email ?? undefined },
        ...extras,
      ];

      const referencias = (dto.referencias ?? '')
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      const buffer = await this.docxGen.generate({
        titulo:         dto.titulo,
        autores,
        orientador:     orientadorParsed,
        coorientadores: coorientadoresParsed,
        cursoTrabalho:  dto.cursoTrabalho,
        secoes:         parsedSecoes,
        palavrasChave: dto.palavrasChave!,
        referencias,
      });

      arquivoUrl = this.saveBuffer(buffer, primary.id, 'resumo.docx');
    }

    const apresentacaoUrl = apresentacaoFile
      ? this.saveFile(apresentacaoFile, primary.id, 'apresentacao')
      : null;

    const work = this.works.create({
      titulo:            dto.titulo,
      cursoTrabalho:     dto.cursoTrabalho,
      categoria:         (dto.categoria as WorkCategory) ?? WorkCategory.JORNADA_EVIDENCIAS,
      tipoTrabalho:      (dto.tipoTrabalho as WorkType) ?? null,
      arquivoUrl,
      apresentacaoUrl,
      status:            EvidenceWorkStatus.PENDENTE,
      dataSubmissao:     new Date(),
      alunoId:           primary.id,
      integrantes:       extras.length ? extras : null,
      tipoSubmissao,
      orientador:        orientadorParsed,
      coorientadores:    coorientadoresParsed.length ? coorientadoresParsed : null,
      resumoIntroducao:  dto.resumoIntroducao?.trim() ?? null,
      resumoObjetivos:   dto.resumoObjetivos?.trim()  ?? null,
      resumoMetodo:      dto.resumoMetodo?.trim()     ?? null,
      resumoResultados:  dto.resumoResultados?.trim() ?? null,
      resumoConclusoes:  dto.resumoConclusoes?.trim() ?? null,
      resumoSecoes:      parsedSecoes.length ? parsedSecoes : null,
      palavrasChave:     dto.palavrasChave?.trim()    ?? null,
      referencias:       dto.referencias?.trim()      ?? null,
    });
    const saved = await this.works.save(work);

    // Dispara emails em background
    this.sendSubmissionEmails(saved, primary, extras, orientadorParsed, coorientadoresParsed).catch(() => {});

    return { ...saved, alunoNome: primary.name };
  }

  private async sendSubmissionEmails(
    work: EvidenceWorkEntity,
    primary: UserEntity,
    extras: { email?: string; nome: string }[],
    orientador: { nome: string; email: string } | null,
    coorientadores: { nome: string; email: string }[],
  ): Promise<void> {
    const recipientEmails = [
      primary.email,
      ...extras.map((e) => e.email).filter(Boolean) as string[],
      ...(orientador?.email ? [orientador.email] : []),
      ...coorientadores.map((c) => c.email).filter(Boolean),
    ];

    const coordinators = await this.users.find({
      where: { role: In([UserRole.ADMIN, UserRole.COORDINATOR, 'ADMIN_JORNADA'] as any), deletedAt: IsNull() },
      select: ['email'],
    });
    const coordinatorEmails = coordinators.map((u) => u.email).filter(Boolean);

    const data = this.buildWorkEmailData(work);
    await this.mailer.notifySubmission(data, recipientEmails, coordinatorEmails);
  }

  private buildWorkEmailData(work: EvidenceWorkEntity) {
    const autores = [
      work.aluno?.name ?? `aluno #${work.alunoId}`,
      ...(work.integrantes ?? []).map((i) => i.nome),
    ];
    return {
      titulo:         work.titulo,
      categoria:      work.categoria,
      cursoTrabalho:  work.cursoTrabalho,
      autores,
      orientador:     work.orientador?.nome,
      coorientadores: work.coorientadores?.map((c) => c.nome),
      dataSubmissao:  work.dataSubmissao,
    };
  }

  private async buildWorkEmails(work: EvidenceWorkEntity) {
    const primary = await this.users.findOne({ where: { id: work.alunoId } });
    const recipients = [
      primary?.email,
      ...(work.integrantes ?? []).map((i) => i.email).filter(Boolean) as string[],
      ...(work.orientador?.email ? [work.orientador.email] : []),
      ...(work.coorientadores ?? []).map((c) => c.email).filter(Boolean),
    ].filter(Boolean) as string[];
    return { recipients };
  }

  /** Histórico de todos os envios do aluno pelo RA. */
  async publicFindHistoryByRa(ra: string) {
    const student = await this.users.findOne({ where: { ra } });
    if (!student) return [];
    const works = await this.works.find({
      where: { alunoId: student.id, deletedAt: IsNull() },
      order: { dataSubmissao: 'DESC' },
    });
    return works.map((w) => ({ ...w, alunoNome: student.name }));
  }

  /** Lista todos os cursos — usado pelo filtro de professor no formulário público. */
  async listPublicCourses() {
    return this.courses.find({
      order: { name: 'ASC' },
      select: ['id', 'name'],
    });
  }

  /** Lista professores cadastrados — usado pelo formulário público de submissão. */
  async listPublicProfessors() {
    return this.users.find({
      where: { role: UserRole.PROFESSOR, deletedAt: IsNull() },
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'cursoBase'],
    });
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
    const uploadRoot = this.config.get<{ root: string }>('uploads')?.root ?? 'uploads';
    const relSegment = `evidence-works/${alunoId}/resumo`;
    const absDir = path.isAbsolute(uploadRoot)
      ? path.join(uploadRoot, relSegment)
      : path.join(process.cwd(), uploadRoot, relSegment);
    fs.mkdirSync(absDir, { recursive: true });
    const fname = `${Date.now()}-${filename}`;
    fs.writeFileSync(path.join(absDir, fname), buffer);
    return `/uploads/${relSegment}/${fname}`;
  }

  private saveFile(file: UploadedMulterFile, alunoId: number, subfolder = 'resumo'): string {
    const uploadRoot = this.config.get<{ root: string }>('uploads')?.root ?? 'uploads';
    const relSegment = `evidence-works/${alunoId}/${subfolder}`;
    const absDir = path.isAbsolute(uploadRoot)
      ? path.join(uploadRoot, relSegment)
      : path.join(process.cwd(), uploadRoot, relSegment);
    fs.mkdirSync(absDir, { recursive: true });
    const filename = `${Date.now()}-${file.originalname}`;
    fs.writeFileSync(path.join(absDir, filename), file.buffer);
    return `/uploads/${relSegment}/${filename}`;
  }
}
