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
   */
  async publicSubmit(
    dto: { ras: string[]; titulo: string; cursoTrabalho: string; categoria: string; tipoTrabalho?: string },
    file?: UploadedMulterFile,
  ) {
    if (!dto.ras?.length) throw new BadRequestException('Informe ao menos um RA.');

    const primaryRa = dto.ras[0]!.trim();
    const primary = await this.users.findOne({ where: { ra: primaryRa, deletedAt: IsNull() } });
    if (!primary) throw new NotFoundException(`Aluno não encontrado para o RA ${primaryRa}.`);

    // Resolve integrantes adicionais
    const extras: { ra: string; nome: string }[] = [];
    for (const ra of dto.ras.slice(1)) {
      const trimmed = ra.trim();
      if (!trimmed) continue;
      const u = await this.users.findOne({ where: { ra: trimmed, deletedAt: IsNull() } });
      if (!u) throw new NotFoundException(`Aluno não encontrado para o RA ${trimmed}.`);
      extras.push({ ra: trimmed, nome: u.name });
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

    const arquivoUrl = file ? this.saveFile(file, primary.id) : null;
    const work = this.works.create({
      titulo:        dto.titulo,
      cursoTrabalho: dto.cursoTrabalho,
      categoria:     (dto.categoria as WorkCategory) ?? WorkCategory.JORNADA_EVIDENCIAS,
      tipoTrabalho:  (dto.tipoTrabalho as WorkType) ?? null,
      arquivoUrl,
      status:        EvidenceWorkStatus.PENDENTE,
      dataSubmissao: new Date(),
      alunoId:       primary.id,
      integrantes:   extras.length ? extras : null,
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
