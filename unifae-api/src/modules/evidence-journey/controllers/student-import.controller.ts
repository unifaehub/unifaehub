import {
  Controller, Get, Post, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JORNADA_ADMIN_ROLES } from '../../../common/guards/jornada-roles';
import { StudentImportService } from '../services/student-import.service';

type UploadedMulterFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

@ApiTags('Jornada — Importação de Alunos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence-journey/students')
export class StudentImportController {
  constructor(private readonly service: StudentImportService) {}

  /** Download do template XLSX. */
  @Get('import/template')
  @Roles(...JORNADA_ADMIN_ROLES)
  downloadTemplate(@Res() res: Response) {
    const buffer = this.service.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template-importacao-alunos.xlsx"');
    res.send(buffer);
  }

  /** Importar alunos a partir de XLSX. Alunos com RA já existente são ignorados. */
  @Post('import')
  @Roles(...JORNADA_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importStudents(@UploadedFile() file: UploadedMulterFile) {
    return this.service.importFromFile(file);
  }
}
