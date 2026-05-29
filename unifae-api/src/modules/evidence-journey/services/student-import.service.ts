import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../../database/entities/user.entity';
import { UserRole } from '../../../database/entities/enums';

type UploadedMulterFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  rows: { nome: string; ra: string; status: 'imported' | 'skipped' | 'error'; reason?: string }[];
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `Estudante@${suffix}`;
}

@Injectable()
export class StudentImportService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  /** Gera o buffer do template XLSX para download. */
  getTemplate(): Buffer {
    const wb = XLSX.utils.book_new();
    const headers = ['Nome *', 'RA *', 'Email *', 'Curso * (ex: ENGENHARIA DE SOFTWARE)'];
    const example = ['João da Silva', '2024001', 'joao.silva@aluno.fae.br', 'ENGENHARIA DE SOFTWARE'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 35 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async importFromFile(file: UploadedMulterFile): Promise<ImportResult> {
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]!];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const result: ImportResult = { imported: 0, skipped: 0, errors: [], rows: [] };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      const nome  = String(row[0] ?? '').trim();
      const ra    = String(row[1] ?? '').trim();
      const email = String(row[2] ?? '').trim();
      const curso = String(row[3] ?? '').trim().toUpperCase();

      // Linha completamente vazia — ignorar sem erro
      if (!nome && !ra && !email && !curso) continue;

      if (!nome || !ra || !email || !curso) {
        result.errors.push(`Linha ${i + 1}: Nome, RA, Email e Curso são obrigatórios.`);
        result.rows.push({ nome: nome || '—', ra: ra || '—', status: 'error', reason: 'Campo obrigatório ausente' });
        continue;
      }

      // RA já existe → ignorar
      const existingRa = await this.users.findOne({ where: { ra } });
      if (existingRa) {
        result.skipped++;
        result.rows.push({ nome, ra, status: 'skipped', reason: 'RA já cadastrado' });
        continue;
      }

      // E-mail duplicado → gerar alternativo
      const emailNorm = email.toLowerCase();
      const existingEmail = await this.users.findOne({ where: { email: emailNorm } });
      const resolvedEmail = existingEmail ? `aluno.${ra}.${Date.now()}@unifae.local` : emailNorm;

      try {
        const hash = await bcrypt.hash(randomPassword(), 10);
        await this.users.save(
          this.users.create({
            name:      nome,
            ra,
            email:     resolvedEmail,
            password:  hash,
            role:      UserRole.STUDENT,
            active:    true,
            cursoBase: curso,
          } as any),
        );
        result.imported++;
        result.rows.push({ nome, ra, status: 'imported' });
      } catch (err) {
        const msg = (err as any)?.message ?? 'Erro desconhecido';
        result.errors.push(`Linha ${i + 1} (${nome}): ${msg}`);
        result.rows.push({ nome, ra, status: 'error', reason: msg });
      }
    }

    return result;
  }
}
