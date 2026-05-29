import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WorksService } from '../services/works.service';
import { JornadaConfigService } from '../services/jornada-config.service';

type UploadedMulterFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Endpoints públicos (sem autenticação) para submissão de trabalhos.
 * Alunos se identificam pelo RA — não é necessário login.
 */
@ApiTags('Jornada — Público')
@Controller('evidence-journey/public')
export class PublicWorksController {
  constructor(
    private readonly works: WorksService,
    private readonly config: JornadaConfigService,
  ) {}

  /** Configuração pública: seções do resumo e períodos de submissão. */
  @Get('config')
  getConfig() {
    return this.config.getPublicConfig();
  }

  /** Lista cursos ativos para filtro de professor no formulário de submissão. */
  @Get('courses')
  listCourses() {
    return this.works.listPublicCourses();
  }

  /** Lista professores cadastrados para uso no formulário de submissão. */
  @Get('professors')
  listProfessors() {
    return this.works.listPublicProfessors();
  }

  /** Histórico de todos os envios do aluno. */
  @Get('works/history/:ra')
  historyByRa(@Param('ra') ra: string) {
    return this.works.publicFindHistoryByRa(ra);
  }

  /** Consulta o trabalho submetido pelo RA do aluno. */
  @Get('works/:ra')
  findByRa(@Param('ra') ra: string) {
    return this.works.publicFindByRa(ra);
  }

  /** Submete ou resubmete um trabalho sem necessidade de login. */
  @Post('works')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'arquivo',      maxCount: 1 },
    { name: 'apresentacao', maxCount: 1 },
  ], { limits: { fileSize: 10 * 1024 * 1024 } })) // 10 MB total por arquivo
  submit(
    @Body() body: {
      ras: string | string[];
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
    @UploadedFiles() files?: { arquivo?: UploadedMulterFile[]; apresentacao?: UploadedMulterFile[] },
  ) {
    const ras = Array.isArray(body.ras)
      ? body.ras
      : String(body.ras ?? '').split(',').map((r) => r.trim()).filter(Boolean);

    const arquivo      = files?.arquivo?.[0];
    const apresentacao = files?.apresentacao?.[0];

    if (arquivo && arquivo.size > MAX_FILE_BYTES) {
      throw new BadRequestException('O arquivo do resumo não pode ultrapassar 3 MB.');
    }
    if (apresentacao && apresentacao.size > 10 * 1024 * 1024) {
      throw new BadRequestException('O arquivo de apresentação não pode ultrapassar 10 MB.');
    }

    return this.works.publicSubmit({ ...body, ras }, arquivo, apresentacao);
  }
}
