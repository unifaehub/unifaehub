import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { intercursoApi, type IntercursoEvento, type ModalidadePublica } from '../src/api/intercurso';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

function proximaData(datas: string[] | null): string | null {
  if (!datas?.length) return null;
  const today  = new Date().toISOString().slice(0, 10);
  const future = datas.filter((d) => d >= today).sort();
  return future[0] ?? datas[datas.length - 1];
}

export default function HomeScreen() {
  const {
    data: evento,
    isLoading: loadingEvento,
    refetch: refetchEvento,
  } = useQuery<IntercursoEvento>({
    queryKey: ['intercurso-evento'],
    queryFn:  intercursoApi.getEvento,
  });

  const {
    data: programa,
    isLoading: loadingPrograma,
    refetch: refetchPrograma,
  } = useQuery<ModalidadePublica[]>({
    queryKey: ['intercurso-programa'],
    queryFn:  intercursoApi.getPrograma,
  });

  const isLoading = loadingEvento || loadingPrograma;

  function onRefresh() {
    refetchEvento();
    refetchPrograma();
  }

  const proxData = proximaData(evento?.datasEvento ?? null);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#1d4ed8" />}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerLogo}>UNIFAE</Text>
        <View style={s.headerDivider} />
        <Text style={s.headerTitle}>
          {evento?.eventoNome ?? 'Intercurso'}
        </Text>
        {evento?.edicao ? (
          <View style={s.edicaoBadge}>
            <Text style={s.edicaoText}>{evento.edicao}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Informações do evento ─────────────────────────────────── */}
      {evento?.eventoLocal || proxData ? (
        <View style={s.infoCard}>
          {evento?.eventoLocal ? (
            <Text style={s.infoText}>📍 {evento.eventoLocal}</Text>
          ) : null}
          {proxData ? (
            <Text style={s.infoText}>📅 {formatDate(proxData)}</Text>
          ) : null}
          {evento?.datasEvento && evento.datasEvento.length > 1 ? (
            <View style={s.dateChips}>
              {evento.datasEvento.map((d) => (
                <View key={d} style={[s.dateChip, d === proxData && s.dateChipActive]}>
                  <Text style={[s.dateChipText, d === proxData && s.dateChipTextActive]}>
                    {formatDate(d)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Descrição ─────────────────────────────────────────────── */}
      {evento?.descricao ? (
        <View style={s.descCard}>
          <Text style={s.descText}>{evento.descricao}</Text>
        </View>
      ) : null}

      {/* ── Atalho: Palavra-chave ─────────────────────────────────── */}
      <TouchableOpacity style={s.kwShortcut} onPress={() => router.push('/palavra-chave')} activeOpacity={0.8}>
        <Text style={s.kwShortcutIcon}>🔑</Text>
        <View style={s.kwShortcutText}>
          <Text style={s.kwShortcutTitle}>Palavra-Chave</Text>
          <Text style={s.kwShortcutSub}>Obtenha seu certificado de participação</Text>
        </View>
        <Text style={s.kwShortcutArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Modalidades ───────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>MODALIDADES</Text>

      {isLoading ? (
        <ActivityIndicator color="#1d4ed8" style={{ marginTop: 20 }} />
      ) : !programa?.length ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏆</Text>
          <Text style={s.emptyText}>Nenhuma modalidade disponível.</Text>
        </View>
      ) : (
        programa.map((mod) => (
          <TouchableOpacity
            key={mod.id}
            style={s.modalCard}
            onPress={() => router.push(`/modalidade/${mod.id}`)}
            activeOpacity={0.8}
          >
            <View style={s.modalCardTop}>
              <Text style={s.modalCardNome}>{mod.nome}</Text>
              <View style={s.modalCardStats}>
                <View style={s.stat}>
                  <Text style={s.statNum}>{mod.equipes.length}</Text>
                  <Text style={s.statLabel}>equipe{mod.equipes.length !== 1 ? 's' : ''}</Text>
                </View>
                {mod.resultados.length > 0 ? (
                  <View style={[s.stat, s.statResult]}>
                    <Text style={s.statResultText}>Resultado disponível</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {mod.descricao ? (
              <Text style={s.modalCardDesc} numberOfLines={2}>{mod.descricao}</Text>
            ) : null}
            <Text style={s.modalCardArrow}>Ver detalhes ›</Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={s.footer}>UNIFAE · Intercurso</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f4ff' },
  content:     { paddingBottom: 40 },

  // Header
  header:      { backgroundColor: '#1d4ed8', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  headerLogo:  { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 6, marginBottom: 4 },
  headerDivider: { width: 32, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 1 },
  edicaoBadge: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  edicaoText:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Info card
  infoCard:    { margin: 16, marginBottom: 0, backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 6, shadowColor: '#000', shadowOpacity: .04, shadowRadius: 6, elevation: 2 },
  infoText:    { fontSize: 14, color: '#374151', fontWeight: '500' },
  dateChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  dateChip:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe' },
  dateChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  dateChipText:   { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  dateChipTextActive: { color: '#fff' },

  // Descrição
  descCard:    { margin: 16, marginBottom: 0, backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: .04, shadowRadius: 6, elevation: 2 },
  descText:    { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  // Palavra-chave shortcut
  kwShortcut:  { margin: 16, marginBottom: 0, backgroundColor: '#1d4ed8', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  kwShortcutIcon: { fontSize: 28 },
  kwShortcutText: { flex: 1 },
  kwShortcutTitle:{ color: '#fff', fontSize: 15, fontWeight: '800' },
  kwShortcutSub:  { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  kwShortcutArrow:{ color: 'rgba(255,255,255,0.7)', fontSize: 22, fontWeight: '300' },

  // Seção
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginTop: 24, marginBottom: 10 },

  // Modalidade card
  modalCard:   { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: .03, shadowRadius: 6, elevation: 2 },
  modalCardTop:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  modalCardNome:{ fontSize: 16, fontWeight: '800', color: '#111', flex: 1 },
  modalCardStats: { alignItems: 'flex-end', gap: 4 },
  stat:        { alignItems: 'center' },
  statNum:     { fontSize: 18, fontWeight: '900', color: '#1d4ed8' },
  statLabel:   { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  statResult:  { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 2 },
  statResultText: { fontSize: 10, color: '#16a34a', fontWeight: '700' },
  modalCardDesc: { fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 19 },
  modalCardArrow: { fontSize: 12, color: '#1d4ed8', fontWeight: '700', marginTop: 8 },

  // Empty
  empty:       { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyIcon:   { fontSize: 36 },
  emptyText:   { color: '#6b7280', fontSize: 14 },

  footer:      { textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 24 },
});
