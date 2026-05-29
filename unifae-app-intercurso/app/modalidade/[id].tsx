import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { intercursoApi, type ModalidadePublica } from '../../src/api/intercurso';

function medalLabel(pos: number | null): string {
  if (!pos) return '';
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return `${pos}º`;
}

export default function ModalidadeScreen() {
  const { top } = useSafeAreaInsets();
  const { id }  = useLocalSearchParams<{ id: string }>();

  const { data: programa, isLoading } = useQuery<ModalidadePublica[]>({
    queryKey: ['intercurso-programa'],
    queryFn:  intercursoApi.getPrograma,
  });

  const mod = programa?.find((m) => m.id === Number(id));

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (!mod) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Modalidade não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.link}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const temResultados = mod.resultados.length > 0;

  // Ordena resultados por posição
  const resultadosOrdenados = [...mod.resultados].sort((a, b) => {
    if (a.posicao == null && b.posicao == null) return 0;
    if (a.posicao == null) return 1;
    if (b.posicao == null) return -1;
    return a.posicao - b.posicao;
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: top + 12 }]}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={s.backText}>← Voltar</Text>
      </TouchableOpacity>

      {/* Cabeçalho da modalidade */}
      <View style={s.headerCard}>
        <Text style={s.modNome}>{mod.nome}</Text>
        {mod.descricao ? (
          <Text style={s.modDesc}>{mod.descricao}</Text>
        ) : null}
        <View style={s.modMeta}>
          <View style={s.metaItem}>
            <Text style={s.metaNum}>{mod.equipes.length}</Text>
            <Text style={s.metaLabel}>Equipes</Text>
          </View>
          <View style={s.metaDivider} />
          <View style={s.metaItem}>
            <Text style={s.metaNum}>{mod.maxMembros}</Text>
            <Text style={s.metaLabel}>Máx. membros</Text>
          </View>
        </View>
      </View>

      {/* Resultados */}
      {temResultados ? (
        <>
          <Text style={s.sectionTitle}>PÓDIO</Text>
          {resultadosOrdenados.map((r) => (
            <View key={r.equipeId} style={[s.resultCard, r.posicao === 1 && s.resultCardFirst]}>
              <Text style={s.resultMedal}>{medalLabel(r.posicao)}</Text>
              <View style={s.resultInfo}>
                <Text style={s.resultEquipe}>{r.equipe?.nome ?? '—'}</Text>
                <Text style={s.resultCurso}>{r.equipe?.curso ?? ''}</Text>
              </View>
              {r.pontuacao ? (
                <View style={s.resultPts}>
                  <Text style={s.resultPtsNum}>{Number(r.pontuacao).toFixed(1)}</Text>
                  <Text style={s.resultPtsLabel}>pts</Text>
                </View>
              ) : null}
            </View>
          ))}
        </>
      ) : null}

      {/* Equipes participantes */}
      <Text style={s.sectionTitle}>EQUIPES PARTICIPANTES</Text>

      {!mod.equipes.length ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>Nenhuma equipe aprovada até o momento.</Text>
        </View>
      ) : (
        mod.equipes.map((e) => (
          <View key={e.id} style={s.equipeCard}>
            <View style={s.equipeHeader}>
              <Text style={s.equipeNome}>{e.nome}</Text>
              <View style={s.cursoBadge}>
                <Text style={s.cursoBadgeText}>{e.cursoRepresentante}</Text>
              </View>
            </View>

            {e.membros?.length ? (
              <View style={s.membros}>
                {e.membros.map((m, i) => (
                  <View key={i} style={s.membroRow}>
                    {m.responsavel ? (
                      <Text style={s.membroIcon}>👑</Text>
                    ) : (
                      <Text style={s.membroIcon}>·</Text>
                    )}
                    <View>
                      <Text style={s.membroNome}>{m.nome}</Text>
                      <Text style={s.membroCurso}>{m.curso} · RA {m.ra}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}

      <Text style={s.footer}>UNIFAE · Intercurso</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f0f4ff' },
  content:      { padding: 16, paddingBottom: 40 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText:    { fontSize: 15, color: '#dc2626' },
  link:         { color: '#1d4ed8', fontSize: 14, fontWeight: '600' },

  backBtn:      { marginBottom: 16 },
  backText:     { color: '#1d4ed8', fontSize: 14, fontWeight: '700' },

  // Header card
  headerCard:   { backgroundColor: '#1d4ed8', borderRadius: 16, padding: 20, marginBottom: 8 },
  modNome:      { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  modDesc:      { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 21, marginBottom: 12 },
  modMeta:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12 },
  metaItem:     { flex: 1, alignItems: 'center' },
  metaNum:      { fontSize: 22, fontWeight: '900', color: '#fff' },
  metaLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
  metaDivider:  { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 10 },

  // Resultados
  resultCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  resultCardFirst:  { borderColor: '#fbbf24', backgroundColor: '#fffbeb' },
  resultMedal:      { fontSize: 28, minWidth: 36, textAlign: 'center' },
  resultInfo:       { flex: 1 },
  resultEquipe:     { fontSize: 15, fontWeight: '800', color: '#111' },
  resultCurso:      { fontSize: 12, color: '#6b7280', marginTop: 2 },
  resultPts:        { alignItems: 'center' },
  resultPtsNum:     { fontSize: 18, fontWeight: '900', color: '#1d4ed8' },
  resultPtsLabel:   { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  // Equipes
  equipeCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  equipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  equipeNome:   { fontSize: 15, fontWeight: '800', color: '#111', flex: 1 },
  cursoBadge:   { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  cursoBadgeText: { fontSize: 11, color: '#1e40af', fontWeight: '700' },

  membros:      { gap: 8 },
  membroRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  membroIcon:   { fontSize: 14, width: 20, textAlign: 'center', marginTop: 1 },
  membroNome:   { fontSize: 13, fontWeight: '600', color: '#374151' },
  membroCurso:  { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  emptyBox:     { backgroundColor: '#f8fafc', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText:    { color: '#9ca3af', fontSize: 14 },

  footer:       { textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 24 },
});
