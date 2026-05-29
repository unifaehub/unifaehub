import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jornadaApi } from '../../../../src/api/jornada';

type Tipo = 'resumo' | 'apresentacao';
const TIPO_LABELS: Record<Tipo, string> = { resumo: 'Resumo', apresentacao: 'Apresentação' };

export default function AvaliacaoTipoScreen() {
  const { salaId, trabalhoId, tipo } = useLocalSearchParams<{
    salaId: string; trabalhoId: string; tipo: string;
  }>();

  const salaNum    = Number(salaId);
  const trabalhoNum = Number(trabalhoId);
  const tipoLabel  = TIPO_LABELS[(tipo as Tipo) ?? 'resumo'] as 'Resumo' | 'Apresentação';

  const qc = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: jornadaApi.getQuestions,
  });

  // Filtrar perguntas pelo tipo
  const filteredQs = (questions ?? []).filter((q) => q.tipo === tipoLabel).sort((a, b) => a.ordem - b.ordem);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]   = useState<Record<number, number>>({}); // perguntaId → nota
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const toastAnim    = useRef(new Animated.Value(0)).current;
  const submittingRef = useRef(false); // guard síncrono contra duplo envio

  useEffect(() => {
    if (!successMsg) return;
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => router.back());
  }, [successMsg]);

  const total      = filteredQs.length;
  const current    = filteredQs[currentIdx];
  const isLast     = currentIdx === total - 1;
  const selectedNota = current ? answers[current.id] : undefined;
  const progress   = total > 0 ? (currentIdx + 1) / total : 0;
  // Bloqueia interação durante envio ou após sucesso (evita duplo clique)
  const isBlocked  = submitting || !!successMsg;
  const canNext    = selectedNota != null && !isBlocked;

  function selectNota(nota: number) {
    if (!current || isBlocked) return;
    setAnswers((prev) => ({ ...prev, [current.id]: nota }));
  }

  function goNext() {
    if (!isLast) { setCurrentIdx((i) => i + 1); return; }
    handleSubmit();
  }

  async function handleSubmit() {
    if (submittingRef.current) return; // guard síncrono contra duplo clique
    const allAnswered = filteredQs.every((q) => answers[q.id] != null);
    if (!allAnswered) {
      Alert.alert('Atenção', 'Avalie todas as perguntas antes de enviar.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await jornadaApi.submitEvaluation(salaNum, trabalhoNum, {
        statusApresentacao: 'Presente',
        respostas: filteredQs.map((q) => ({ perguntaId: q.id, nota: answers[q.id]! })),
        comentario: comment.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['eval-status', salaNum] });
      setSuccessMsg(`Avaliação de ${tipoLabel} enviada!`);
      // Mantém submitting=true após sucesso para bloquear o botão até router.back()
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível enviar.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator color="#0d631b" size="large" /></View>;
  }

  if (!filteredQs.length) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>Nenhuma pergunta de {tipoLabel} cadastrada.</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.link}>Voltar</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Toast de sucesso */}
      {successMsg && (
        <Animated.View style={[s.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <Text style={s.toastText}>✅ {successMsg}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{tipoLabel}</Text>
        <Text style={s.headerCounter}>{currentIdx + 1}/{total}</Text>
      </View>

      {/* Barra de progresso */}
      <View style={s.progressTrack}>
        <View style={[s.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* Número da pergunta */}
        <Text style={s.questionNum}>Pergunta {currentIdx + 1} de {total}</Text>

        {/* Texto da pergunta */}
        <View style={s.questionCard}>
          <Text style={s.questionText}>{current?.textoPergunta}</Text>
        </View>

        {/* Notas 1-10 */}
        <Text style={s.notaLabel}>Selecione uma nota:</Text>
        <View style={s.notaGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                s.notaBtn,
                selectedNota === n && s.notaBtnSelected,
                n <= 4  && selectedNota === n && s.notaBtnLow,
                n >= 7  && selectedNota === n && s.notaBtnHigh,
                isBlocked && s.notaBtnBlocked,
              ]}
              disabled={isBlocked}
              onPress={() => selectNota(n)}
            >
              <Text style={[s.notaBtnText, selectedNota === n && s.notaBtnTextSelected]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comentário — apenas na última pergunta */}
        {isLast && (
          <View style={s.commentSection}>
            <Text style={s.commentLabel}>
              Comentário sobre o {tipoLabel.toLowerCase()} (opcional):
            </Text>
            <TextInput
              style={s.commentInput}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              placeholder={`Observações gerais sobre o ${tipoLabel.toLowerCase()}...`}
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Navegação */}
        <View style={s.navRow}>
          {currentIdx > 0 && (
            <TouchableOpacity style={s.btnPrev} onPress={() => setCurrentIdx((i) => i - 1)}>
              <Text style={s.btnPrevText}>‹ Anterior</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.btnNext, !canNext && s.btnNextDisabled, { flex: 1 }]}
            disabled={!canNext || submitting}
            onPress={goNext}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnNextText}>{isLast ? `Enviar ${tipoLabel}` : 'Próxima ›'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Indicadores das notas já respondidas */}
        <View style={s.dotRow}>
          {filteredQs.map((q, i) => (
            <View
              key={q.id}
              style={[
                s.dot,
                i === currentIdx && s.dotActive,
                answers[q.id] != null && i !== currentIdx && s.dotDone,
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:    { color: '#374151', fontSize: 15, marginBottom: 12 },
  link:         { color: '#0d631b', fontSize: 14 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backText:     { color: '#0d631b', fontSize: 14, fontWeight: '600', minWidth: 60 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: '#111' },
  headerCounter:{ fontSize: 14, color: '#9ca3af', minWidth: 40, textAlign: 'right' },
  progressTrack:{ height: 4, backgroundColor: '#f3f4f6' },
  progressBar:  { height: 4, backgroundColor: '#0d631b', borderRadius: 2 },
  body:         { padding: 20, paddingBottom: 40 },
  questionNum:  { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 },
  questionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 90, justifyContent: 'center' },
  questionText: { fontSize: 17, color: '#111', lineHeight: 26, fontWeight: '500' },
  notaLabel:    { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  notaGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24, justifyContent: 'center' },
  notaBtn:      { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  notaBtnBlocked: { opacity: 0.4 },
  notaBtnSelected: { borderColor: '#0d631b', backgroundColor: '#0d631b' },
  notaBtnLow:   { borderColor: '#dc2626', backgroundColor: '#dc2626' },
  notaBtnHigh:  { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  notaBtnText:  { fontSize: 16, fontWeight: '800', color: '#374151' },
  notaBtnTextSelected: { color: '#fff' },
  commentSection: { marginBottom: 24 },
  commentLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  commentInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 14, color: '#111', minHeight: 100 },
  navRow:       { flexDirection: 'row', gap: 10, marginBottom: 16 },
  btnPrev:      { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnPrevText:  { color: '#374151', fontWeight: '700', fontSize: 15 },
  btnNext:      { backgroundColor: '#0d631b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnNextDisabled: { backgroundColor: '#9ca3af' },
  btnNextText:  { color: '#fff', fontWeight: '800', fontSize: 15 },
  dotRow:       { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  dotActive:    { backgroundColor: '#0d631b', width: 20 },
  dotDone:      { backgroundColor: '#86efac' },
  toast:        { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#0d631b', borderRadius: 14, padding: 16, zIndex: 999, shadowColor: '#000', shadowOpacity: .18, shadowRadius: 12, elevation: 8 },
  toastText:    { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' },
});
