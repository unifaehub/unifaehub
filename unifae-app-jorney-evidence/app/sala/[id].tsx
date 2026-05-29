import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jornadaApi, type Room } from '../../src/api/jornada';

type PresenceStatus = 'Presente' | 'Ausente' | 'Indeferido';

export default function SalaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const salaId  = Number(id);
  const qc      = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['my-rooms'],
    queryFn: jornadaApi.getMyRooms,
  });

  const room: Room | undefined = rooms?.find((r) => r.id === salaId);

  const { data: evalStatus, isLoading: loadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['eval-status', salaId],
    queryFn: () => jornadaApi.getMyEvalStatus(salaId),
    enabled: !!room,
  });

  const { data: questions } = useQuery({
    queryKey: ['questions'],
    queryFn: jornadaApi.getQuestions,
    enabled: !!room,
  });

  const [savingStatus, setSavingStatus] = useState(false);

  // Status de presença já enviado ou selecionado localmente
  const submittedStatus = evalStatus?.statusApresentacao as PresenceStatus | null ?? null;

  // IDs de perguntas já respondidas
  const submittedIds = new Set(evalStatus?.submittedPerguntaIds ?? []);

  // Quais tipos foram completamente enviados
  const resumoQs   = (questions ?? []).filter((q) => q.tipo === 'Resumo');
  const apresQs    = (questions ?? []).filter((q) => q.tipo === 'Apresentação');
  const resumoDone = resumoQs.length > 0 && resumoQs.every((q) => submittedIds.has(q.id));
  const aresDone   = apresQs.length > 0  && apresQs.every((q) => submittedIds.has(q.id));

  async function markStatus(status: PresenceStatus) {
    if (submittedStatus) return; // já enviado
    if (status === 'Presente') return; // Presente → vai para avaliação, não envia aqui
    const confirmMsg =
      status === 'Ausente'
        ? 'Confirmar que o aluno está AUSENTE? Isso será registrado.'
        : 'Confirmar INDEFERIMENTO? O trabalho será desclassificado por título divergente.';
    Alert.alert('Confirmar', confirmMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', style: 'destructive',
        onPress: async () => {
          setSavingStatus(true);
          try {
            await jornadaApi.submitEvaluation(salaId, room!.trabalho!.id, { statusApresentacao: status });
            await refetchStatus();
            qc.invalidateQueries({ queryKey: ['my-rooms'] });
          } catch (e: any) {
            Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível registrar.');
          } finally {
            setSavingStatus(false);
          }
        },
      },
    ]);
  }

  if (isLoading || loadingStatus) {
    return <View style={s.center}><ActivityIndicator color="#0d631b" size="large" /></View>;
  }

  if (!room) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Sala não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.link}>Voltar</Text></TouchableOpacity>
      </View>
    );
  }

  const banca  = room.banca ?? [];
  const lider  = room.professorLider;
  const isPresente = submittedStatus === 'Presente' || submittedStatus === null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Voltar</Text>
      </TouchableOpacity>

      {/* Cabeçalho da sala */}
      <View style={s.salaHeader}>
        <Text style={s.salaId}>Sala #{room.id}</Text>
        {room.fechada && <View style={s.fechadaBadge}><Text style={s.fechadaText}>🔒 Fechada</Text></View>}
      </View>
      <Text style={s.titulo}>{room.trabalho?.titulo ?? '—'}</Text>
      <Text style={s.sub}>{room.trabalho?.cursoTrabalho} · {room.trabalho?.aluno?.name ?? '—'}</Text>
      <Text style={s.date}>
        {new Date(room.dataEvento + 'T00:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long',
        })}
      </Text>

      {/* Banca */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Banca</Text>
        {banca.map((rp) => (
          <Text key={rp.professor.id} style={s.bancaItem}>
            {rp.professor.name}{lider && rp.professor.id === lider.id ? ' 👑' : ''}
          </Text>
        ))}
      </View>

      {/* Status de presença */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Presença do Aluno</Text>

        {submittedStatus === 'Ausente' && (
          <View style={[s.statusBanner, { backgroundColor: '#fef2f2' }]}>
            <Text style={{ color: '#dc2626', fontWeight: '700' }}>⛔ Aluno marcado como AUSENTE</Text>
          </View>
        )}
        {submittedStatus === 'Indeferido' && (
          <View style={[s.statusBanner, { backgroundColor: '#fef9c3' }]}>
            <Text style={{ color: '#854d0e', fontWeight: '700' }}>⚠️ Trabalho INDEFERIDO</Text>
          </View>
        )}

        {!submittedStatus && !room.fechada && (
          <View style={s.presenceRow}>
            <TouchableOpacity
              style={[s.presBtn, s.presBtnPresente]}
              disabled={savingStatus}
              onPress={() => markStatus('Presente')}
            >
              <Text style={s.presBtnText}>✅ Presente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.presBtn, s.presBtnAusente]}
              disabled={savingStatus}
              onPress={() => markStatus('Ausente')}
            >
              <Text style={s.presBtnText}>⛔ Ausente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.presBtn, s.presBtnIndefer]}
              disabled={savingStatus}
              onPress={() => markStatus('Indeferido')}
            >
              <Text style={s.presBtnText}>⚠️ Indeferir</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Avaliação — só aparece se Presente (ou sem status ainda) e sala não fechada */}
      {(submittedStatus === 'Presente' || submittedStatus === null) && !room.fechada && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Avaliações</Text>

          <TouchableOpacity
            style={[s.evalBtn, resumoDone && s.evalBtnDone]}
            onPress={() => router.push(`/avaliacao/${salaId}/${room.trabalho!.id}/resumo`)}
            disabled={resumoDone}
          >
            <View style={s.evalBtnInner}>
              <Text style={s.evalBtnIcon}>{resumoDone ? '✅' : '📄'}</Text>
              <View>
                <Text style={s.evalBtnTitle}>Avaliar Resumo</Text>
                <Text style={s.evalBtnSub}>
                  {resumoDone
                    ? 'Enviado'
                    : `${resumoQs.filter((q) => submittedIds.has(q.id)).length}/${resumoQs.length} perguntas`}
                </Text>
              </View>
            </View>
            {!resumoDone && <Text style={s.evalBtnArrow}>›</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.evalBtn, aresDone && s.evalBtnDone]}
            onPress={() => router.push(`/avaliacao/${salaId}/${room.trabalho!.id}/apresentacao`)}
            disabled={aresDone}
          >
            <View style={s.evalBtnInner}>
              <Text style={s.evalBtnIcon}>{aresDone ? '✅' : '🎤'}</Text>
              <View>
                <Text style={s.evalBtnTitle}>Avaliar Apresentação</Text>
                <Text style={s.evalBtnSub}>
                  {aresDone
                    ? 'Enviado'
                    : `${apresQs.filter((q) => submittedIds.has(q.id)).length}/${apresQs.length} perguntas`}
                </Text>
              </View>
            </View>
            {!aresDone && <Text style={s.evalBtnArrow}>›</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Fechar sala */}
      {!room.fechada && lider && (
        <TouchableOpacity style={s.fecharBtn} onPress={() => router.push(`/fechamento/${salaId}`)}>
          <Text style={s.fecharBtnText}>Fechar Sala</Text>
        </TouchableOpacity>
      )}

      {room.fechada && (
        <View style={s.closedBanner}>
          <Text style={s.closedBannerText}>✅ Esta sala foi encerrada.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafc' },
  content:       { padding: 20 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:     { fontSize: 15, color: '#dc2626' },
  link:          { color: '#0d631b', marginTop: 10, fontSize: 14 },
  back:          { marginBottom: 14 },
  backText:      { color: '#0d631b', fontSize: 14, fontWeight: '600' },
  salaHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  salaId:        { fontSize: 22, fontWeight: '900', color: '#0d631b' },
  fechadaBadge:  { backgroundColor: '#e0e7ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  fechadaText:   { color: '#4338ca', fontWeight: '700', fontSize: 12 },
  titulo:        { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 4, lineHeight: 23 },
  sub:           { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  date:          { fontSize: 12, color: '#9ca3af', marginBottom: 20 },
  section:       { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 },
  bancaItem:     { fontSize: 14, color: '#374151', marginBottom: 4 },
  statusBanner:  { borderRadius: 8, padding: 12 },
  presenceRow:   { flexDirection: 'row', gap: 8 },
  presBtn:       { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5 },
  presBtnPresente: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  presBtnAusente:  { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  presBtnIndefer:  { borderColor: '#d97706', backgroundColor: '#fffbeb' },
  presBtnText:   { fontSize: 12, fontWeight: '700', color: '#374151' },
  evalBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  evalBtnDone:   { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  evalBtnInner:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  evalBtnIcon:   { fontSize: 24 },
  evalBtnTitle:  { fontSize: 15, fontWeight: '700', color: '#111' },
  evalBtnSub:    { fontSize: 12, color: '#6b7280', marginTop: 2 },
  evalBtnArrow:  { fontSize: 22, color: '#9ca3af' },
  fecharBtn:     { borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20 },
  fecharBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  closedBanner:  { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  closedBannerText: { color: '#6b7280', fontWeight: '600' },
});
