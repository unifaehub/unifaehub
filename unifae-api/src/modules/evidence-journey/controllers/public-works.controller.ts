import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WorksService } from '../services/works.service';

type UploadedMulterFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

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
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 20 * 1024 * 1024 } }))
  submit(
    @Body() dto: { ra: string; titulo: string; cursoTrabalho: string; categoria: string; tipoTrabalho?: string },
    @UploadedFile() file?: UploadedMulterFile,
  ) {
    return this.works.publicSubmit(dto, file);
  }
}
