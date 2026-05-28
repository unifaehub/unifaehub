import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { jornadaApi } from '../../src/api/jornada';

export default function FechamentoScreen() {
  const { salaId } = useLocalSearchParams<{ salaId: string }>();
  const salaNum = Number(salaId);

  const [senha, setSenha] = useState('');
  const [melhorId, setMelhorId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: rooms } = useQuery({ queryKey: ['my-rooms'], queryFn: jornadaApi.getMyRooms });
  const room = rooms?.find((r) => r.id === salaNum);

  async function handleClose() {
    if (!senha.trim()) { Alert.alert('Atenção', 'Informe sua senha para confirmar.'); return; }
    setSubmitting(true);
    try {
      await jornadaApi.closeRoom(salaNum, senha, melhorId ?? undefined);
      Alert.alert('Sala encerrada', 'O relatório foi enviado por e-mail.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Não foi possível fechar a sala.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Fechar Sala #{salaNum}</Text>
      <Text style={styles.desc}>
        Ao fechar a sala, um relatório com as notas será enviado por e-mail.
        Esta ação é irreversível.
      </Text>

      {room && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecionar Melhor Trabalho</Text>
          <Text style={styles.sectionDesc}>Obrigatório para o líder da banca.</Text>
          <TouchableOpacity
            style={[styles.trabalhoBtn, melhorId === room.trabalho?.id && styles.trabalhoSelected]}
            onPress={() => setMelhorId(room.trabalho?.id ?? null)}
          >
            <Text style={styles.trabalhoBtnText}>{room.trabalho?.titulo}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confirmação de Identidade</Text>
        <Text style={styles.label}>Digite sua senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="Sua senha de acesso"
        />
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={handleClose} disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.closeBtnText}>Confirmar Fechamento</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  back: { marginBottom: 12 },
  backText: { color: '#0d631b', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 8 },
  desc: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  section: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  trabalhoBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12 },
  trabalhoSelected: { borderColor: '#0d631b', backgroundColor: '#e8f5e9' },
  trabalhoBtnText: { fontSize: 14, color: '#374151' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15 },
  closeBtn: { backgroundColor: '#dc2626', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
