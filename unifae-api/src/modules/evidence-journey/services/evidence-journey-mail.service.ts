import { Injectable } from '@nestjs/common';
import { MailService } from '../../identity-access/mail.service';

interface WorkEmailData {
  titulo: string;
  categoria: string;
  cursoTrabalho: string;
  autores: string[];        // nomes dos integrantes
  orientador?: string;      // nome do orientador
  coorientadores?: string[]; // nomes dos co-orientadores
  dataSubmissao?: Date;
}

@Injectable()
export class EvidenceJourneyMailService {
  constructor(private readonly mail: MailService) {}

  /** E-mail enviado a todos ao submeter um trabalho. */
  async notifySubmission(
    data: WorkEmailData,
    recipientEmails: string[],   // alunos + orientador + co-orientadores
    coordinatorEmails: string[], // admins e coordenadores
  ): Promise<void> {
    if (!this.mail.isConfigured()) return;

    const allTo = [...new Set([...recipientEmails, ...coordinatorEmails])].filter(Boolean);
    if (!allTo.length) return;

    const subject = `Trabalho submetido: ${data.titulo}`;
    const html = this.templateSubmissao(data, coordinatorEmails.length > 0);
    await this.send(allTo, subject, html);
  }

  /** E-mail enviado quando um trabalho é aprovado. */
  async notifyApproval(
    data: WorkEmailData,
    recipientEmails: string[],
  ): Promise<void> {
    if (!this.mail.isConfigured()) return;
    const allTo = [...new Set(recipientEmails)].filter(Boolean);
    if (!allTo.length) return;
    const subject = `Trabalho aprovado: ${data.titulo}`;
    const html = this.templateAprovacao(data);
    await this.send(allTo, subject, html);
  }

  /** E-mail enviado quando um trabalho é reprovado. */
  async notifyRejection(
    data: WorkEmailData,
    recipientEmails: string[],
    motivo: string,
  ): Promise<void> {
    if (!this.mail.isConfigured()) return;
    const allTo = [...new Set(recipientEmails)].filter(Boolean);
    if (!allTo.length) return;
    const subject = `Trabalho reprovado: ${data.titulo}`;
    const html = this.templateReprovacao(data, motivo);
    await this.send(allTo, subject, html);
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  private templateSubmissao(data: WorkEmailData, incluiCoordenadores: boolean): string {
    const rows = [
      ['Título', data.titulo],
      ['Evento', data.categoria],
      ['Curso', data.cursoTrabalho],
      ['Integrantes', data.autores.join(', ')],
      ...(data.orientador ? [['Orientador(a)', data.orientador] as [string,string]] : []),
      ...(data.coorientadores?.length ? [['Co-orientador(es)', data.coorientadores.join(', ')] as [string,string]] : []),
      ['Data de envio', (data.dataSubmissao ?? new Date()).toLocaleString('pt-BR', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' })],
    ].map(([k, v]) => `<tr><td style="font-weight:600;padding:6px 12px;white-space:nowrap;color:#374151">${k}</td><td style="padding:6px 12px;color:#111">${this.esc(v)}</td></tr>`).join('');

    const aviso = incluiCoordenadores
      ? '<p style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e;margin:20px 0">Esta mensagem foi também enviada à coordenação do evento.</p>'
      : '';

    return this.layout(`
      <h2 style="color:#166534;margin-top:0">Trabalho submetido com sucesso ✅</h2>
      <p>O trabalho abaixo foi registrado na plataforma e está aguardando análise da coordenação.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        ${rows}
      </table>
      ${aviso}
      <p style="color:#6b7280;font-size:13px">Você receberá um novo e-mail quando o trabalho for avaliado.</p>
    `);
  }

  private templateAprovacao(data: WorkEmailData): string {
    return this.layout(`
      <h2 style="color:#166534;margin-top:0">Trabalho aprovado! 🎉</h2>
      <p>O trabalho <strong>${this.esc(data.titulo)}</strong> foi <strong style="color:#166534">aprovado</strong> pela coordenação do evento.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <tr><td style="font-weight:600;padding:6px 12px;color:#374151">Evento</td><td style="padding:6px 12px">${this.esc(data.categoria)}</td></tr>
        <tr><td style="font-weight:600;padding:6px 12px;color:#374151">Integrantes</td><td style="padding:6px 12px">${this.esc(data.autores.join(', '))}</td></tr>
        ${data.orientador ? `<tr><td style="font-weight:600;padding:6px 12px;color:#374151">Orientador(a)</td><td style="padding:6px 12px">${this.esc(data.orientador)}</td></tr>` : ''}
      </table>
      <p style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;font-size:13px;color:#166534">
        Parabéns! Seu trabalho está confirmado para o evento. Fique atento às instruções da coordenação sobre data, horário e local de apresentação.
      </p>
    `);
  }

  private templateReprovacao(data: WorkEmailData, motivo: string): string {
    return this.layout(`
      <h2 style="color:#991b1b;margin-top:0">Trabalho reprovado</h2>
      <p>O trabalho <strong>${this.esc(data.titulo)}</strong> foi <strong style="color:#991b1b">reprovado</strong> pela coordenação do evento.</p>
      <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-weight:600;color:#991b1b;margin:0 0 6px">Motivo da reprovação:</p>
        <p style="color:#111;margin:0">${this.esc(motivo)}</p>
      </div>
      <p>Se ainda estiver dentro do período de submissões, você poderá corrigir e reenviar o trabalho pela plataforma.</p>
      <p style="color:#6b7280;font-size:13px">
        Integrantes: ${this.esc(data.autores.join(', '))}${data.orientador ? ` · Orientador(a): ${this.esc(data.orientador)}` : ''}
      </p>
    `);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private layout(content: string): string {
    return `
<div style="font-family:sans-serif;background:#f4f7f4;padding:32px 16px;color:#333">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.06);border:1px solid #e0e6e0">
    <div style="border-bottom:2px solid #0d631b;margin-bottom:24px;padding-bottom:12px">
      <span style="font-size:18px;font-weight:800;color:#0d631b">UNIFAE Hub</span>
      <span style="color:#6b7280;font-size:13px;margin-left:8px">Jornada de Evidências</span>
    </div>
    ${content}
    <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="color:#9ca3af;font-size:11px;margin:0">&copy; ${new Date().getFullYear()} UNIFAE Hub — Esta é uma mensagem automática, não responda a este e-mail.</p>
  </div>
</div>`;
  }

  private async send(to: string[], subject: string, html: string): Promise<void> {
    try {
      await this.mail.sendHtml({ to: to[0], bcc: to.slice(1), subject, html });
    } catch (e) {
      console.error('[EvidenceJourneyMail] Falha ao enviar e-mail:', e);
    }
  }

  private esc(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
