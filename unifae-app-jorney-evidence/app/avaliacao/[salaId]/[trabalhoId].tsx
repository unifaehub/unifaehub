import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { jornadaApi } from '../../../src/api/jornada';

type AnswerMap = Record<number, { nota: string; comentario: string }>;

export default function AvaliacaoScreen() {
  const { salaId, trabalhoId } = useLocalSearchParams<{ salaId: string; trabalhoId: string }>();
  const salaNum = Number(salaId);
  const trabalhoNum = Number(trabalhoId);

  const [status, setStatus] = useState<'Presente' | 'Ausente' | 'Indeferido' | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: jornadaApi.getQuestions,
  });

  function setAnswer(pid: number, field: 'nota' | 'comentario', value: string) {
    setAnswers((prev) => ({ ...prev, [pid]: { ...prev[pid] ?? { nota: '', comentario: '' }, [field]: value } }));
  }

  async function submit() {
    if (!status) { Alert.alert('Atenção', 'Selecione o status de presença.'); return; }
    if (status === 'Presente') {
      const missing = (questions ?? []).find((q) => !answers[q.id]?.nota);
      if (missing) { Alert.alert('Atenção', 'Preencha a nota para todas as perguntas.'); return; }
    }
    setSubmitting(true);
    try {
      const respostas = status === 'Presente'
        ? (questions ?? []).map((q) => ({
            perguntaId: q.id,
            nota: parseInt(answers[q.id]?.nota ?? '0', 10),
            comentario: answers[q.id]?.comentario,
          }))
        : undefined;

      await jornadaApi.submitEvaluation(salaNum, trabalhoNum, { statusApresentacao: status, respostas });
      Alert.alert('Sucesso', 'Avaliação enviada!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Não foi possível enviar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#0d631b" size="large" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Avaliar Trabalho</Text>

      {/* Status de presença */}
      <Text style={styles.sectionTitle}>Status de Presença</Text>
      <View style={styles.statusRow}>
        {(['Presente', 'Ausente', 'Indeferido'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, status === s && styles.statusBtnActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {status === 'Indeferido' && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>⚠️ Indeferido: título divergente. O trabalho será desclassificado.</Text>
        </View>
      )}

      {/* Perguntas (somente se Presente) */}
      {status === 'Presente' && (questions ?? []).map((q) => (
        <View key={q.id} style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={[styles.tipoBadge, q.tipo === 'Resumo' ? styles.tipoResumo : styles.tipoApres]}>{q.tipo}</Text>
          </View>
          <Text style={styles.questionText}>{q.textoPergunta}</Text>
          <Text style={styles.notaLabel}>Nota (1-10)</Text>
          <TextInput
            style={styles.notaInput}
            keyboardType="numeric"
            maxLength={2}
            value={answers[q.id]?.nota ?? ''}
            onChangeText={(v) => setAnswer(q.id, 'nota', v)}
            placeholder="1 a 10"
          />
          <TextInput
            style={styles.comentarioInput}
            multiline
            value={answers[q.id]?.comentario ?? ''}
            onChangeText={(v) => setAnswer(q.id, 'comentario', v)}
            placeholder="Comentário (opcional)"
          />
        </View>
      ))}

      {status && (
        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Enviar Avaliação</Text>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { marginBottom: 12 },
  backText: { color: '#0d631b', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statusBtn: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, padding: 10, alignItems: 'center' },
  statusBtnActive: { borderColor: '#0d631b', backgroundColor: '#e8f5e9' },
  statusBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  statusBtnTextActive: { color: '#0d631b' },
  warnBox: { backgroundColor: '#fef9c3', borderRadius: 8, padding: 12, marginBottom: 16 },
  warnText: { color: '#854d0e', fontSize: 13 },
  questionCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  questionHeader: { marginBottom: 6 },
  tipoBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', textTransform: 'uppercase' },
  tipoResumo: { backgroundColor: '#e0f2fe', color: '#0369a1' },
  tipoApres: { backgroundColor: '#fce7f3', color: '#9d174d' },
  questionText: { fontSize: 14, color: '#111', marginBottom: 10, lineHeight: 20 },
  notaLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  notaInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 10, fontSize: 15, marginBottom: 8, width: 80 },
  comentarioInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 10, fontSize: 13, minHeight: 60, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#0d631b', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
