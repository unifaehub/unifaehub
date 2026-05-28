import { apiClient } from './client';

export type Room = {
  id: number;
  dataEvento: string;
  trabalho: { id: number; titulo: string; cursoTrabalho: string };
  professorLider: { id: number; name: string };
  banca: { professor: { id: number; name: string } }[];
  fechada: boolean;
};

export type Question = {
  id: number;
  textoPergunta: string;
  tipo: 'Resumo' | 'Apresentação';
  ordem: number;
};

export type Keyword = {
  id: number;
  palavra: string;
  dataAgendamento: string;
  horaInicio: string;
} | null;

export const jornadaApi = {
  getMyRooms: async (): Promise<Room[]> => {
    const { data } = await apiClient.get('/evidence-journey/my-rooms');
    return data;
  },

  getQuestions: async (): Promise<Question[]> => {
    const { data } = await apiClient.get('/evidence-journey/questions');
    return data;
  },

  getCurrentKeyword: async (): Promise<Keyword> => {
    const { data } = await apiClient.get('/evidence-journey/keywords/current');
    return data;
  },

  submitEvaluation: async (
    salaId: number,
    trabalhoId: number,
    payload: {
      statusApresentacao: 'Presente' | 'Ausente' | 'Indeferido';
      respostas?: { perguntaId: number; nota?: number; comentario?: string }[];
    },
  ) => {
    const { data } = await apiClient.post(
      `/evidence-journey/rooms/${salaId}/works/${trabalhoId}/evaluate`,
      payload,
    );
    return data;
  },

  closeRoom: async (salaId: number, senha: string, melhorTrabalhoId?: number) => {
    const { data } = await apiClient.post(`/evidence-journey/rooms/${salaId}/close`, {
      senha,
      melhorTrabalhoId,
    });
    return data;
  },
};
