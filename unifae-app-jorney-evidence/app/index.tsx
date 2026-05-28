import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { jornadaApi, type Room } from '../src/api/jornada';
import { useAuth } from '../src/context/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user]);

  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['my-rooms'],
    queryFn: jornadaApi.getMyRooms,
    enabled: !!user,
  });

  function renderRoom({ item: r }: { item: Room }) {
    return (
      <TouchableOpacity
        style={[styles.card, r.fechada && styles.cardClosed]}
        onPress={() => router.push(`/sala/${r.id}`)}
        disabled={r.fechada}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>Sala #{r.id}</Text>
          {r.fechada && <Text style={styles.badgeClosed}>Fechada</Text>}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{r.trabalho?.titulo}</Text>
        <Text style={styles.cardSub}>{r.trabalho?.cursoTrabalho}</Text>
        <Text style={styles.cardDate}>Evento: {new Date(r.dataEvento + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Olá, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>Suas salas de apresentação</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms ?? []}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderRoom}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma sala atribuída para hoje.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#0d631b', padding: 20, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  welcome: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#bbf7d0', fontSize: 13, marginTop: 2 },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#bbf7d0', fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: .04, shadowRadius: 8, elevation: 2 },
  cardClosed: { opacity: .6, backgroundColor: '#f9fafb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardId: { fontWeight: '700', color: '#0d631b', fontSize: 13 },
  badgeClosed: { fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
