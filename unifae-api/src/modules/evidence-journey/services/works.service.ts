import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { EvidenceWorkEntity } from '../../../database/entities/evidence-work.entity';
import { EvidenceWorkStatus } from '../../../database/entities/enums';
import { UserEntity } from '../../../database/entities/user.entity';
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
