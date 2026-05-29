import { Injectable } from '@nestjs/common';
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';

export interface WorkDocxData {
  titulo: string;
  /** Responsável principal + integrantes, em ordem. */
  autores: { nome: string; email?: string }[];
  orientador: { nome: string; email: string } | null;
  coorientadores: { nome: string; email: string }[];
  cursoTrabalho: string;
  resumo: {
    introducao: string;
    objetivos: string;
    metodo: string;
    resultados: string;
    conclusoes: string;
  };
  palavrasChave: string;
  /** Uma referência por item. */
  referencias: string[];
}

const FONT = 'Calibri';
const SIZE = 22; // 11 pt (half-points)

function empty(): Paragraph {
  return new Paragraph({ children: [] });
}

function boldRun(text: string): TextRun {
  return new TextRun({ text, bold: true, font: FONT, size: SIZE });
}

function normalRun(text: string): TextRun {
  return new TextRun({ text, font: FONT, size: SIZE });
}

@Injectable()
export class EvidenceWorkDocxService {
  async generate(data: WorkDocxData): Promise<Buffer> {
    const children: Paragraph[] = [];

    // ── Título ─────────────────────────────────────────────────────────
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [boldRun(data.titulo.toUpperCase())],
      }),
    );
    children.push(empty());

    // ── Autores ────────────────────────────────────────────────────────
    for (const a of data.autores) {
      const line = a.email ? `${a.nome} – ${a.email}` : a.nome;
      children.push(new Paragraph({ children: [normalRun(line)] }));
    }
    children.push(empty());

    // ── Orientador ─────────────────────────────────────────────────────
    if (data.orientador) {
      const orientLine = data.orientador.email
        ? `${data.orientador.nome} – ${data.orientador.email}`
        : data.orientador.nome;
      children.push(
        new Paragraph({
          children: [boldRun('Orientador(a): '), normalRun(orientLine)],
        }),
      );
    }

    // ── Co-orientadores ────────────────────────────────────────────────
    for (const co of data.coorientadores ?? []) {
      const coLine = co.email ? `${co.nome} – ${co.email}` : co.nome;
      children.push(
        new Paragraph({
          children: [boldRun('Coorientador(a): '), normalRun(coLine)],
        }),
      );
    }

    // ── Curso ──────────────────────────────────────────────────────────
    children.push(
      new Paragraph({
        children: [boldRun('Curso: '), normalRun(`${data.cursoTrabalho}.`)],
      }),
    );
    children.push(empty());

    // ── Resumo ─────────────────────────────────────────────────────────
    children.push(new Paragraph({ children: [boldRun('Resumo:')] }));

    const sections: { label: string; text: string }[] = [
      { label: 'Introdução: ', text: data.resumo.introducao },
      { label: 'Objetivos: ', text: data.resumo.objetivos },
      { label: 'Método: ', text: data.resumo.metodo },
      { label: 'Resultados: ', text: data.resumo.resultados },
      { label: 'Conclusões: ', text: data.resumo.conclusoes },
    ];

    for (const s of sections) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.BOTH,
          children: [boldRun(s.label), normalRun(s.text)],
        }),
      );
    }
    children.push(empty());

    // ── Palavras-chave ─────────────────────────────────────────────────
    children.push(
      new Paragraph({
        children: [
          boldRun('Palavras-chave: '),
          new TextRun({ text: data.palavrasChave, italics: true, font: FONT, size: SIZE }),
        ],
      }),
    );
    children.push(empty());

    // ── Referências ────────────────────────────────────────────────────
    children.push(new Paragraph({ children: [boldRun('Referências Bibliográficas:')] }));

    for (const ref of data.referencias) {
      if (ref.trim()) {
        children.push(new Paragraph({ children: [normalRun(ref.trim())] }));
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1800, bottom: 1440, left: 1800 },
            },
          },
          children,
        },
      ],
    });

    return Packer.toBuffer(doc);
  }
}
