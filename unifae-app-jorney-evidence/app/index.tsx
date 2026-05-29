import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { jornadaApi, type Room } from '../src/api/jornada';
import { useAuth } from '../src/context/AuthContext';
import { useSideMenu } from '../src/context/SideMenuContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { openMenu } = useSideMenu();

  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['my-rooms'],
    queryFn: jornadaApi.getMyRooms,
    enabled: !!user,
  });

  // Stats derivadas — total de salas e trabalhos únicos
  const totalSalas  = rooms?.length ?? 0;
  const totalWorks  = rooms?.reduce((s, r) => s + (r.works?.length ?? 0), 0) ?? 0;
  const totalProfs  = rooms?.length
    ? [...new Set(rooms.flatMap((r) => r.banca.map((b) => b.professor.id)))].length
    : 0;

  function renderRoom({ item: r }: { item: Room }) {
    const nWorks    = r.works?.length ?? 0;
    const bancaProfs = r.banca.map((b) => b.professor.name).join(', ');
    const isClosed  = r.fechada;

    return (
      <TouchableOpacity
        style={[styles.card, isClosed && styles.cardClosed]}
        onPress={() => router.push(`/sala/${r.id}`)}
        disabled={isClosed}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardSalaId}>Sala {r.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: isClosed ? '#6366f118' : '#0d631b18' }]}>
            <Text style={[styles.statusPillText, { color: isClosed ? '#6366f1' : '#0d631b' }]}>
              {isClosed ? '🔒 Fechada' : '📋 Avaliar'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{nWorks}</Text>
            <Text style={styles.statLabel}>trabalho{nWorks !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.profText} numberOfLines={1}>
            Prof{r.banca.length !== 1 ? 's' : ''}: {bancaProfs || '—'}
          </Text>
        </View>

        {r.tipoSala && r.tipoSala !== 'Geral' && (
          <Text style={styles.tipoLabel}>{r.tipoSala}</Text>
        )}

        <Text style={styles.cardDate}>
          {new Date(r.dataEvento + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Jornada de Evidências e Mostra de Jogos</Text>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={openMenu}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statCards}>
        <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.statCardNum, { color: '#0d631b' }]}>{totalSalas}</Text>
          <Text style={styles.statCardLabel}>Sala{totalSalas !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
          <Text style={[styles.statCardNum, { color: '#1565c0' }]}>{totalWorks}</Text>
          <Text style={styles.statCardLabel}>Trabalho{totalWorks !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fce4ec' }]}>
          <Text style={[styles.statCardNum, { color: '#c62828' }]}>{totalProfs}</Text>
          <Text style={styles.statCardLabel}>Prof. banca</Text>
        </View>
      </View>

      {/* Lista de salas */}
      <Text style={styles.sectionTitle}>Suas salas hoje</Text>

      <FlatList
        data={rooms ?? []}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderRoom}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0d631b" />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎓</Text>
              <Text style={styles.emptyText}>Nenhuma sala atribuída para hoje.</Text>
              <Text style={styles.emptyHint}>Verifique se o sorteio foi executado.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  header:         { backgroundColor: '#0d631b', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greeting:       { color: '#fff', fontSize: 22, fontWeight: '800' },
  subGreeting:    { color: '#bbf7d0', fontSize: 12, marginTop: 2 },
  menuBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  menuIcon:       { color: '#fff', fontSize: 18, fontWeight: '700' },
  statCards:      { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  statCard:       { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statCardNum:    { fontSize: 26, fontWeight: '900' },
  statCardLabel:  { fontSize: 11, color: '#555', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 8 },
  list:           { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card:           { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: .04, shadowRadius: 6, elevation: 2 },
  cardClosed:     { opacity: .6 },
  cardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardSalaId:     { fontWeight: '800', color: '#0d631b', fontSize: 16 },
  statusPill:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  statsRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statChip:       { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statNum:        { fontSize: 16, fontWeight: '800', color: '#111' },
  statLabel:      { fontSize: 12, color: '#6b7280' },
  statSep:        { color: '#d1d5db', fontSize: 14 },
  profText:       { fontSize: 12, color: '#6b7280', flex: 1 },
  tipoLabel:      { fontSize: 11, color: '#5b21b6', backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 4, fontWeight: '600' },
  cardDate:       { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  empty:          { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon:      { fontSize: 40 },
  emptyText:      { color: '#374151', fontSize: 15, fontWeight: '600' },
  emptyHint:      { color: '#9ca3af', fontSize: 13 },
});
