import { apiClient } from './client';

export type IntercursoEvento = {
  eventoNome: string | null;
  eventoLocal: string | null;
  edicao: string | null;
  descricao: string | null;
  datasEvento: string[] | null;
  inscricaoInicio: string | null;
  inscricaoFim: string | null;
  certificadoUrl: string | null;
};

export type MembroPublico = {
  nome: string;
  ra: string;
  curso: string;
  responsavel?: boolean;
};

export type EquipePublica = {
  id: number;
  nome: string;
  cursoRepresentante: string;
  membros: MembroPublico[] | null;
};

export type ResultadoPublico = {
  equipeId: number;
  equipe: { nome: string; curso: string } | null;
  posicao: number | null;
  pontuacao: string | null;
};

export type ModalidadePublica = {
  id: number;
  nome: string;
  descricao: string | null;
  maxMembros: number;
  ordem: number;
  equipes: EquipePublica[];
  resultados: ResultadoPublico[];
};

export type KeywordAtual = {
  id: number;
  palavra: string;
  dataAgendamento: string;
  horaInicio: string;
} | null;

export const intercursoApi = {
  getEvento: async (): Promise<IntercursoEvento> => {
    const { data } = await apiClient.get('/intercurso/public/evento');
    return data;
  },

  getPrograma: async (): Promise<ModalidadePublica[]> => {
    const { data } = await apiClient.get('/intercurso/public/programa');
    return data;
  },

  getCurrentKeyword: async (): Promise<KeywordAtual> => {
    const { data } = await apiClient.get('/intercurso/public/keywords/current');
    return data;
  },
};
