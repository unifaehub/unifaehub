import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WorksService } from '../services/works.service';

type UploadedMulterFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Endpoints públicos (sem autenticação) para submissão de trabalhos.
 * Alunos se identificam pelo RA — não é necessário login.
 */
@ApiTags('Jornada — Público')
@Controller('evidence-journey/public')
export class PublicWorksController {
  constructor(private readonly works: WorksService) {}

  /** Consulta o trabalho submetido pelo RA do aluno. */
  @Get('works/:ra')
  findByRa(@Param('ra') ra: string) {
    return this.works.publicFindByRa(ra);
  }

  /** Submete ou resubmete um trabalho sem necessidade de login. */
  @Post('works')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: MAX_FILE_BYTES } }))
  submit(
    @Body() body: {
      ras: string | string[];
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
    @UploadedFile() file?: UploadedMulterFile,
  ) {
    const ras = Array.isArray(body.ras)
      ? body.ras
      : String(body.ras ?? '').split(',').map((r) => r.trim()).filter(Boolean);

    if (file && file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('O arquivo não pode ultrapassar 3 MB.');
    }

    return this.works.publicSubmit({ ...body, ras }, file);
  }
}
