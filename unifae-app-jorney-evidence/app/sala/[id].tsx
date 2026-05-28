import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { jornadaApi, type Room } from '../../src/api/jornada';

export default function SalaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const salaId = Number(id);

  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['my-rooms'],
    queryFn: jornadaApi.getMyRooms,
  });

  const { data: keyword, refetch: refetchKeyword } = useQuery({
    queryKey: ['keyword'],
    queryFn: jornadaApi.getCurrentKeyword,
  });

  const room = rooms?.find((r) => r.id === salaId);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#0d631b" size="large" /></View>;
  }

  if (!room) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Sala não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>Voltar</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Sala #{room.id}</Text>
      <Text style={styles.trabalhoTitle}>{room.trabalho?.titulo}</Text>
      <Text style={styles.sub}>{room.trabalho?.cursoTrabalho}</Text>
      <Text style={styles.date}>Data: {new Date(room.dataEvento + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Banca</Text>
        {room.banca.map((rp) => (
          <Text key={rp.professor.id} style={styles.bancaItem}>
            {rp.professor.name}
            {rp.professor.id === room.professorLider.id ? ' (Líder)' : ''}
          </Text>
        ))}
      </View>

      {keyword ? (
        <View style={styles.keywordBox}>
          <Text style={styles.keywordLabel}>Palavra-Chave Atual</Text>
          <Text style={styles.keyword}>{keyword.palavra}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.refreshBtn} onPress={() => refetchKeyword()}>
        <Text style={styles.refreshBtnText}>↻ Atualizar Palavra-Chave</Text>
      </TouchableOpacity>

      {!room.fechada && (
        <>
          <TouchableOpacity
            style={styles.avaliarBtn}
            onPress={() => router.push(`/avaliacao/${salaId}/${room.trabalho.id}`)}
          >
            <Text style={styles.avaliarBtnText}>Avaliar Trabalho</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fecharBtn}
            onPress={() => router.push(`/fechamento/${salaId}`)}
          >
            <Text style={styles.fecharBtnText}>Fechar Sala</Text>
          </TouchableOpacity>
        </>
      )}

      {room.fechada && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerText}>Esta sala foi encerrada.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#dc2626' },
  link: { color: '#0d631b', marginTop: 10, fontSize: 14 },
  back: { marginBottom: 16 },
  backText: { color: '#0d631b', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#0d631b', marginBottom: 6 },
  trabalhoTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  date: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  section: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 },
  bancaItem: { fontSize: 14, color: '#374151', marginBottom: 4 },
  keywordBox: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 16, marginBottom: 12, alignItems: 'center' },
  keywordLabel: { fontSize: 11, fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: 6 },
  keyword: { fontSize: 22, fontWeight: '800', color: '#0d631b' },
  refreshBtn: { borderWidth: 1, borderColor: '#0d631b', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 20 },
  refreshBtnText: { color: '#0d631b', fontWeight: '600', fontSize: 14 },
  avaliarBtn: { backgroundColor: '#0d631b', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  avaliarBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fecharBtn: { borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 10, padding: 14, alignItems: 'center' },
  fecharBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  closedBanner: { backgroundColor: '#f3f4f6', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 12 },
  closedBannerText: { color: '#6b7280', fontWeight: '600' },
});
