import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jornadaApi, type Room, type WorkEvalStatus } from '../../src/api/jornada';

type PresenceStatus = 'Presente' | 'Ausente' | 'Indeferido';

export default function SalaScreen() {
  const { top: topInset } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const salaId = Number(id);
  const qc     = useQueryClient();

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

  // Estado local de presença: só salvo no servidor para Ausente/Indeferido.
  // "Presente" é registrado localmente para liberar os botões de avaliação —
  // o servidor só confirma Presente quando as respostas são enviadas.
  const [localPresence, setLocalPresence] = useState<Record<number, PresenceStatus>>({});
  const [savingStatus, setSavingStatus]   = useState<number | null>(null);

  const resumoQs = (questions ?? []).filter((q) => q.tipo === 'Resumo');
  const apresQs  = (questions ?? []).filter((q) => q.tipo === 'Apresentação');

  function getWorkStatus(trabalhoId: number): WorkEvalStatus | undefined {
    return evalStatus?.works.find((w) => w.trabalhoId === trabalhoId);
  }

  // Status efetivo: servidor tem prioridade; local apenas para "Presente" pendente
  function effectiveStatus(trabalhoId: number): PresenceStatus | null {
    const server = getWorkStatus(trabalhoId)?.statusApresentacao ?? null;
    return server ?? localPresence[trabalhoId] ?? null;
  }

  async function markStatus(trabalhoId: number, status: PresenceStatus) {
    const ws = getWorkStatus(trabalhoId);
    if (ws?.statusApresentacao) return; // já confirmado no servidor

    if (status === 'Presente') {
      // Apenas marcar localmente; servidor salva Presente junto com as respostas
      setLocalPresence((prev) => ({ ...prev, [trabalhoId]: 'Presente' }));
      return;
    }

    const confirmMsg =
      status === 'Ausente'
        ? 'Confirmar que o aluno está AUSENTE? Isso será registrado.'
        : 'Confirmar INDEFERIMENTO? O trabalho será desclassificado por título divergente.';

    Alert.alert('Confirmar', confirmMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', style: 'destructive',
        onPress: async () => {
          setSavingStatus(trabalhoId);
          try {
            await jornadaApi.submitEvaluation(salaId, trabalhoId, { statusApresentacao: status });
            await refetchStatus();
            qc.invalidateQueries({ queryKey: ['my-rooms'] });
          } catch (e: any) {
            Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível registrar.');
          } finally {
            setSavingStatus(null);
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

  const banca = room.banca ?? [];
  const lider = room.professorLider;

  // Verifica se TODOS os trabalhos da sala estão finalizados pelo professor:
  // - Ausente / Indeferido (confirmado no servidor), OU
  // - Resumo + Apresentação completamente enviados
  const allWorksDone = (room.works ?? []).length > 0 && (room.works ?? []).every((rw) => {
    const ws     = getWorkStatus(rw.trabalhoId);
    const srv    = ws?.statusApresentacao ?? null;
    if (srv === 'Ausente' || srv === 'Indeferido') return true;
    const subIds = new Set(ws?.submittedPerguntaIds ?? []);
    const rDone  = resumoQs.length > 0 && resumoQs.every((q) => subIds.has(q.id));
    const aDone  = apresQs.length > 0  && apresQs.every((q) => subIds.has(q.id));
    return rDone && aDone;
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: topInset + 12 }]}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Voltar</Text>
      </TouchableOpacity>

      {/* Cabeçalho */}
      <View style={s.salaHeader}>
        <Text style={s.salaId}>
          {room.hall ? `Sala ${room.hall.nome}` : `Sala #${room.id}`}
        </Text>
        {room.fechada && <View style={s.fechadaBadge}><Text style={s.fechadaText}>🔒 Fechada</Text></View>}
        {room.tipoSala && room.tipoSala !== 'Geral' && (
          <View style={s.tipoBadge}><Text style={s.tipoText}>{room.tipoSala}</Text></View>
        )}
      </View>
      {(room.hall?.andar || room.hall?.setor?.nome) && (
        <Text style={s.hallSub}>
          {[room.hall.setor?.nome, room.hall.andar].filter(Boolean).join(' · ')}
        </Text>
      )}
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

      {/* Trabalhos da sala */}
      {(room.works ?? []).map((rw) => {
        const ws          = getWorkStatus(rw.trabalhoId);
        const statusEfet  = effectiveStatus(rw.trabalhoId);
        const serverStatus = ws?.statusApresentacao ?? null;
        const subIds      = new Set(ws?.submittedPerguntaIds ?? []);
        const resumoDone  = resumoQs.length > 0 && resumoQs.every((q) => subIds.has(q.id));
        const aresDone    = apresQs.length > 0  && apresQs.every((q) => subIds.has(q.id));
        const isSaving    = savingStatus === rw.trabalhoId;
        const showEvals   = statusEfet === 'Presente' && !room.fechada;
        const showPresRow = !serverStatus && statusEfet !== 'Presente' && !room.fechada;

        return (
          <View key={rw.trabalhoId} style={s.workBlock}>
            {/* Cabeçalho do trabalho */}
            <View style={s.workHeader}>
              <Text style={s.workNum}>{rw.ordem}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.workTitulo}>{rw.trabalho?.titulo ?? '—'}</Text>
                <Text style={s.workSub}>
                  {rw.trabalho?.cursoTrabalho} · {rw.trabalho?.aluno?.name ?? '—'}
                </Text>
              </View>
              {/* Badge de status quando confirmado */}
              {serverStatus === 'Ausente' && (
                <View style={s.badgeAusente}><Text style={s.badgeAusenteText}>Ausente</Text></View>
              )}
              {serverStatus === 'Indeferido' && (
                <View style={s.badgeIndefer}><Text style={s.badgeIndeferText}>Indeferido</Text></View>
              )}
              {(resumoDone && aresDone) && (
                <View style={s.badgeDone}><Text style={s.badgeDoneText}>✅ Avaliado</Text></View>
              )}
              {statusEfet === 'Presente' && !resumoDone && (
                <View style={s.badgePresente}><Text style={s.badgePresenteText}>Presente</Text></View>
              )}
            </View>

            {/* Botões de presença — apenas quando não há status ainda */}
            {showPresRow && (
              <>
                <View style={s.presenceRow}>
                  <TouchableOpacity
                    style={[s.presBtn, s.presBtnPresente]}
                    disabled={isSaving}
                    onPress={() => markStatus(rw.trabalhoId, 'Presente')}
                  >
                    <Text style={s.presBtnText}>✅ Presente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.presBtn, s.presBtnAusente]}
                    disabled={isSaving}
                    onPress={() => markStatus(rw.trabalhoId, 'Ausente')}
                  >
                    <Text style={s.presBtnText}>⛔ Ausente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.presBtn, s.presBtnIndefer]}
                    disabled={isSaving}
                    onPress={() => markStatus(rw.trabalhoId, 'Indeferido')}
                  >
                    <Text style={s.presBtnText}>⚠️ Indeferir</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.presHint}>Selecione o status de presença para liberar as avaliações.</Text>
              </>
            )}

            {isSaving && <ActivityIndicator color="#0d631b" style={{ marginVertical: 8 }} />}

            {/* Botões de avaliação — apenas após marcar Presente */}
            {showEvals && (
              <View style={s.evalBtns}>
                <TouchableOpacity
                  style={[s.evalBtn, resumoDone && s.evalBtnDone]}
                  onPress={() => router.push(`/avaliacao/${salaId}/${rw.trabalhoId}/resumo`)}
                  disabled={resumoDone}
                >
                  <View style={s.evalBtnInner}>
                    <Text style={s.evalBtnIcon}>{resumoDone ? '✅' : '📄'}</Text>
                    <View>
                      <Text style={s.evalBtnTitle}>Avaliar Resumo</Text>
                      <Text style={s.evalBtnSub}>
                        {resumoDone ? 'Enviado' : `${resumoQs.filter((q) => subIds.has(q.id)).length}/${resumoQs.length} perguntas`}
                      </Text>
                    </View>
                  </View>
                  {!resumoDone && <Text style={s.evalBtnArrow}>›</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.evalBtn, aresDone && s.evalBtnDone]}
                  onPress={() => router.push(`/avaliacao/${salaId}/${rw.trabalhoId}/apresentacao`)}
                  disabled={aresDone}
                >
                  <View style={s.evalBtnInner}>
                    <Text style={s.evalBtnIcon}>{aresDone ? '✅' : '🎤'}</Text>
                    <View>
                      <Text style={s.evalBtnTitle}>Avaliar Apresentação</Text>
                      <Text style={s.evalBtnSub}>
                        {aresDone ? 'Enviado' : `${apresQs.filter((q) => subIds.has(q.id)).length}/${apresQs.length} perguntas`}
                      </Text>
                    </View>
                  </View>
                  {!aresDone && <Text style={s.evalBtnArrow}>›</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* Fechar sala — apenas líder e somente após todas as avaliações */}
      {!room.fechada && lider && (
        <TouchableOpacity
          style={[s.fecharBtn, !allWorksDone && s.fecharBtnDisabled]}
          disabled={!allWorksDone}
          onPress={() => router.push(`/fechamento/${salaId}`)}
        >
          <Text style={[s.fecharBtnText, !allWorksDone && s.fecharBtnTextDisabled]}>
            Fechar Sala
          </Text>
        </TouchableOpacity>
      )}

      {!room.fechada && lider && !allWorksDone && (
        <Text style={s.fecharHint}>
          Conclua todas as avaliações para poder fechar a sala.
        </Text>
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
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  content:        { padding: 20, paddingTop: 20 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:      { fontSize: 15, color: '#dc2626' },
  link:           { color: '#0d631b', marginTop: 10, fontSize: 14 },
  back:           { marginBottom: 14 },
  backText:       { color: '#0d631b', fontSize: 14, fontWeight: '600' },
  salaHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  salaId:         { fontSize: 22, fontWeight: '900', color: '#0d631b', flexShrink: 1 },
  hallSub:        { fontSize: 13, color: '#6b7280', marginBottom: 2, marginTop: -2 },
  fechadaBadge:   { backgroundColor: '#e0e7ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  fechadaText:    { color: '#4338ca', fontWeight: '700', fontSize: 12 },
  tipoBadge:      { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tipoText:       { color: '#5b21b6', fontWeight: '700', fontSize: 11 },
  date:           { fontSize: 12, color: '#9ca3af', marginBottom: 18 },
  section:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 },
  bancaItem:      { fontSize: 14, color: '#374151', marginBottom: 4 },
  // Work blocks
  workBlock:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  workHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  workNum:        { fontSize: 16, fontWeight: '800', color: '#0d631b', minWidth: 22 },
  workTitulo:     { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 2, lineHeight: 21 },
  workSub:        { fontSize: 12, color: '#6b7280' },
  // Badges inline
  badgeAusente:   { backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeAusenteText:{ color: '#dc2626', fontSize: 11, fontWeight: '700' },
  badgeIndefer:   { backgroundColor: '#fef9c3', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeIndeferText:{ color: '#854d0e', fontSize: 11, fontWeight: '700' },
  badgeDone:      { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeDoneText:  { color: '#16a34a', fontSize: 11, fontWeight: '700' },
  badgePresente:  { backgroundColor: '#e8f5e9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgePresenteText:{ color: '#0d631b', fontSize: 11, fontWeight: '700' },
  // Presença
  presenceRow:    { flexDirection: 'row', gap: 8, marginBottom: 6 },
  presBtn:        { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5 },
  presBtnPresente:{ borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  presBtnAusente: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  presBtnIndefer: { borderColor: '#d97706', backgroundColor: '#fffbeb' },
  presBtnText:    { fontSize: 11, fontWeight: '700', color: '#374151' },
  presHint:       { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginBottom: 4 },
  // Avaliação
  evalBtns:       { marginTop: 8, gap: 8 },
  evalBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  evalBtnDone:    { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  evalBtnInner:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  evalBtnIcon:    { fontSize: 22 },
  evalBtnTitle:   { fontSize: 14, fontWeight: '700', color: '#111' },
  evalBtnSub:     { fontSize: 11, color: '#6b7280', marginTop: 1 },
  evalBtnArrow:   { fontSize: 20, color: '#9ca3af' },
  // Fechar sala
  fecharBtn:         { borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8, marginTop: 8 },
  fecharBtnDisabled: { borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  fecharBtnText:     { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  fecharBtnTextDisabled: { color: '#9ca3af' },
  fecharHint:        { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },
  closedBanner:      { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  closedBannerText:  { color: '#6b7280', fontWeight: '600' },
});
