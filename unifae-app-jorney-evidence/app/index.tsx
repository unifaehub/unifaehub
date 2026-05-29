import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { jornadaApi, type Room } from '../src/api/jornada';
import { useAuth } from '../src/context/AuthContext';
import { useSideMenu } from '../src/context/SideMenuContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { openMenu } = useSideMenu();
  const [expandedBanca, setExpandedBanca] = useState<number | null>(null);

  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['my-rooms'],
    queryFn: jornadaApi.getMyRooms,
    enabled: !!user,
  });

  const totalSalas = rooms?.length ?? 0;
  const totalWorks = rooms?.reduce((s, r) => s + (r.works?.length ?? 0), 0) ?? 0;
  const totalProfs = rooms?.length
    ? [...new Set(rooms.flatMap((r) => r.banca.map((b) => b.professor.id)))].length
    : 0;

  function hallLabel(r: Room): string {
    if (!r.hall) return `Sala ${r.id}`;
    const parts = [r.hall.nome];
    if (r.hall.andar)        parts.push(r.hall.andar);
    if (r.hall.setor?.nome)  parts.push(r.hall.setor.nome);
    return parts.join(' · ');
  }

  function renderRoom({ item: r }: { item: Room }) {
    const nWorks      = r.works?.length ?? 0;
    const nBanca      = r.banca?.length ?? 0;
    const isClosed    = r.fechada;
    const bancaOpen   = expandedBanca === r.id;

    return (
      <TouchableOpacity
        style={[styles.card, isClosed && styles.cardClosed]}
        onPress={() => router.push(`/sala/${r.id}`)}
        disabled={isClosed}
        activeOpacity={0.8}
      >
        {/* Cabeçalho: nome da sala física */}
        <View style={styles.cardTop}>
          <Text style={styles.cardSalaLabel}>{hallLabel(r)}</Text>
          <View style={[styles.pill, { backgroundColor: isClosed ? '#e0e7ff' : '#e8f5e9' }]}>
            <Text style={[styles.pillText, { color: isClosed ? '#4338ca' : '#0d631b' }]}>
              {isClosed ? '🔒 Fechada' : '📋 Avaliar'}
            </Text>
          </View>
        </View>

        {r.tipoSala && r.tipoSala !== 'Geral' && (
          <Text style={styles.tipoChip}>{r.tipoSala}</Text>
        )}

        {/* Stats da sala */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBig}>{nWorks}</Text>
            <Text style={styles.statSmall}>Trabalho{nWorks !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Banca — clicável para expandir */}
          <TouchableOpacity
            style={styles.statBox}
            onPress={(e) => {
              e.stopPropagation?.();
              setExpandedBanca(bancaOpen ? null : r.id);
            }}
          >
            <Text style={styles.statBig}>{nBanca}</Text>
            <Text style={[styles.statSmall, styles.statLink]}>
              Prof. Banca {bancaOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de professores (expandível) */}
        {bancaOpen && (
          <View style={styles.bancaList}>
            {r.banca.map((rp) => {
              const isLider = rp.professor.id === r.professorLider?.id;
              return (
                <View key={rp.professor.id} style={styles.bancaItem}>
                  <Text style={styles.bancaName}>{rp.professor.name}</Text>
                  {isLider && <View style={styles.liderChip}><Text style={styles.liderText}>Líder</Text></View>}
                </View>
              );
            })}
          </View>
        )}
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

      {/* Stats globais */}
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
              <Text style={styles.emptyHint}>Verifique se o sorteio foi executado para hoje.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { backgroundColor: '#0d631b', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greeting:     { color: '#fff', fontSize: 22, fontWeight: '800' },
  subGreeting:  { color: '#bbf7d0', fontSize: 12, marginTop: 2 },
  menuBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  menuIcon:     { color: '#fff', fontSize: 18, fontWeight: '700' },
  statCards:    { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  statCard:     { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statCardNum:  { fontSize: 26, fontWeight: '900' },
  statCardLabel:{ fontSize: 11, color: '#555', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 8 },
  list:         { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  // Card
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: .04, shadowRadius: 6, elevation: 2 },
  cardClosed:   { opacity: .6 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 6 },
  cardSalaLabel:{ fontWeight: '800', color: '#0d631b', fontSize: 15, flex: 1 },
  pill:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText:     { fontSize: 12, fontWeight: '700' },
  tipoChip:     { fontSize: 11, color: '#5b21b6', backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8, fontWeight: '600' },
  // Stats row
  statsRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statBox:      { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statBig:      { fontSize: 22, fontWeight: '900', color: '#111' },
  statSmall:    { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 2 },
  statLink:     { color: '#0d631b' },
  statDivider:  { width: 1, height: 36, backgroundColor: '#e5e7eb' },
  // Banca expandida
  bancaList:    { marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, gap: 6 },
  bancaItem:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bancaName:    { fontSize: 13, color: '#374151', flex: 1 },
  liderChip:    { backgroundColor: '#fef9c3', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  liderText:    { fontSize: 10, fontWeight: '700', color: '#854d0e' },
  // Vazio
  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon:    { fontSize: 40 },
  emptyText:    { color: '#374151', fontSize: 15, fontWeight: '600' },
  emptyHint:    { color: '#9ca3af', fontSize: 13 },
});
