import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const mail = this.config.get<{
      smtpUser: string;
      smtpPass: string;
    }>('mail');
    const u = mail?.smtpUser?.trim() ?? '';
    const p = mail?.smtpPass?.trim() ?? '';
    return u.length > 0 && p.length > 0;
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const mail = this.config.get<{
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUser: string;
      smtpPass: string;
    }>('mail');
    if (!mail) throw new Error('Configuração de e-mail ausente.');
    this.transporter = nodemailer.createTransport({
      host: mail.smtpHost,
      port: mail.smtpPort,
      secure: mail.smtpSecure,
      auth: {
        user: mail.smtpUser,
        pass: mail.smtpPass,
      },
    });
    return this.transporter;
  }

  async sendRecoveryCodeEmail(
    to: string,
    code: string,
    recipientName: string | undefined,
  ): Promise<void> {
    const mail = this.config.get<{
      from: string;
    }>('mail');
    const reset = this.config.get<{
      deepLinkBase: string;
      publicWebBase: string;
    }>('passwordReset');
    const from = mail?.from ?? 'UNIFAE Hub';
    
    // Caminho do logo para anexo
    const logoPath = join(process.cwd(), 'assets', 'logo.png');

    const lines: string[] = [
      'Olá' + (recipientName?.trim() ? `, ${recipientName.trim()}` : '') + ',',
      '',
      'Use o código abaixo no aplicativo para confirmar a recuperação de senha:',
      '',
      code,
      '',
      'O código expira em breve. Se você não pediu isso, ignore este e-mail.',
      '',
      '— UNIFAE Hub',
    ];

    const text = lines.join('\n');
    const html = `
<div style="font-family: sans-serif; background-color: #f4f7f4; padding: 40px 20px; color: #333;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e0e6e0;">
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="cid:logo" alt="UNIFAE Hub" style="height: 60px; width: auto;" />
    </div>
    
    <h2 style="margin-top: 0; color: #1a1a1a; font-size: 20px;">Recuperação de Senha</h2>
    <p style="line-height: 1.6;">Olá${recipientName?.trim() ? `, <strong>${recipientName.trim()}</strong>` : ''},</p>
    <p style="line-height: 1.6;">Você solicitou a recuperação de sua senha no <strong>UNIFAE Hub</strong>. Utilize o código de segurança abaixo:</p>
    
    <div style="background: #f0f7f0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; border: 1px dashed #2e7d32;">
      <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #2e7d32;">${this.escapeHtml(code)}</span>
    </div>
    
    <p style="line-height: 1.6;">Após inserir o código, você poderá criar uma nova senha de acesso.</p>
    
    <div style="margin: 32px 0; text-align: center;">
      ${reset?.publicWebBase ? `<a href="${this.escapeHtml(`${reset.publicWebBase.replace(/\/$/, '')}/redefinir-senha?code=${encodeURIComponent(code)}`)}" style="background: linear-gradient(135deg, #2e7d32, #4caf50); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir na Web</a>` : ''}
    </div>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 32px 0;" />
    
    <p style="color: #666; font-size: 12px; line-height: 1.6; margin-bottom: 0;">
      Este código é temporário e expirará em breve por motivos de segurança.<br />
      Se você não solicitou esta alteração, por favor ignore este e-mail.
    </p>
  </div>
  <div style="text-align: center; margin-top: 24px; color: #888; font-size: 12px;">
    &copy; ${new Date().getFullYear()} UNIFAE Hub — Clínica Editorial
  </div>
</div>`;

    await this.getTransporter().sendMail({
      from,
      to,
      subject: 'Código de recuperação de senha — UNIFAE Hub',
      text,
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: logoPath,
          cid: 'logo',
        },
      ],
    });
  }

  async sendDayClosureReport(params: {
    to: string;
    recipientName?: string;
    dataEvento: string;
    trabalhoTitulo: string;
    rows: { professor: string; pergunta: string; tipo: string; nota: number; status: string; comentario: string }[];
  }): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('[dev] SMTP não configurado — relatório de fechamento não enviado.');
      return;
    }
    const mail = this.config.get<{ from: string }>('mail');
    const from = mail?.from ?? 'UNIFAE Hub';
    const tableRows = params.rows
      .map(
        (r) =>
          `<tr><td>${this.escapeHtml(r.professor)}</td><td>${this.escapeHtml(r.pergunta)}</td>` +
          `<td>${this.escapeHtml(r.tipo)}</td><td>${r.nota}</td><td>${this.escapeHtml(r.status)}</td>` +
          `<td>${this.escapeHtml(r.comentario)}</td></tr>`,
      )
      .join('');

    const html = `
<div style="font-family:sans-serif;padding:24px;color:#333">
  <h2>Relatório de Fechamento — ${this.escapeHtml(params.dataEvento)}</h2>
  <p>Olá${params.recipientName ? `, <strong>${this.escapeHtml(params.recipientName)}</strong>` : ''}!</p>
  <p>Trabalho: <strong>${this.escapeHtml(params.trabalhoTitulo)}</strong></p>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
    <thead style="background:#e8f5e9">
      <tr><th>Professor</th><th>Pergunta</th><th>Tipo</th><th>Nota</th><th>Status</th><th>Comentário</th></tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p style="margin-top:16px;color:#666;font-size:12px">&copy; ${new Date().getFullYear()} UNIFAE Hub — Jornada de Evidências</p>
</div>`;

    await this.getTransporter().sendMail({
      from,
      to: params.to,
      subject: `Relatório de Fechamento — ${params.dataEvento} — ${params.trabalhoTitulo}`,
      html,
    });
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  logDevRecoveryCodeHint(email: string, code: string): void {
    this.logger.warn(`[dev] SMTP não configurado — código de recuperação para ${email}: ${code}`);
  }
}
