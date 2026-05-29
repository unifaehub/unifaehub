import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Linking, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { intercursoApi, type KeywordAtual, type IntercursoEvento } from '../src/api/intercurso';

export default function PalavraChaveScreen() {
  const { top } = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const { data: keyword, isLoading, refetch } = useQuery<KeywordAtual>({
    queryKey: ['intercurso-keyword-current'],
    queryFn:  intercursoApi.getCurrentKeyword,
    refetchInterval: 60_000, // atualiza a cada 1 min automaticamente
  });

  const { data: evento } = useQuery<IntercursoEvento>({
    queryKey: ['intercurso-evento'],
    queryFn:  intercursoApi.getEvento,
  });

  const certUrl = evento?.certificadoUrl ?? 'https://sis.fae.br:8080/eventos';

  async function handleCopy() {
    if (!keyword) return;
    await Clipboard.setStringAsync(keyword.palavra);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleOpenSIS() {
    const supported = await Linking.canOpenURL(certUrl);
    if (!supported) {
      Alert.alert('Erro', 'Não foi possível abrir o sistema de certificados.');
      return;
    }
    await Linking.openURL(certUrl);
  }

  async function handleCopyAndOpen() {
    await handleCopy();
    await handleOpenSIS();
  }

  function formatHour(h: string) {
    return h.substring(0, 5);
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    });
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: top + 12 }]}
    >
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={s.backText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={s.titleArea}>
        <Text style={s.title}>🔑 Palavra-Chave</Text>
        <Text style={s.subtitle}>Use para obter seu certificado de participação</Text>
      </View>

      {/* Card da palavra-chave */}
      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#1d4ed8" size="large" />
          <Text style={s.loadingText}>Verificando palavra-chave…</Text>
        </View>
      ) : keyword ? (
        <View style={s.kwCard}>
          <View style={s.kwBadge}>
            <Text style={s.kwBadgeText}>● ATIVA AGORA</Text>
          </View>
          <Text style={s.kwPalavra}>{keyword.palavra}</Text>
          <Text style={s.kwMeta}>
            {formatDate(keyword.dataAgendamento)} · a partir das {formatHour(keyword.horaInicio)}
          </Text>

          {/* Botões */}
          <TouchableOpacity style={s.btnCopy} onPress={handleCopy} activeOpacity={0.8}>
            <Text style={s.btnCopyText}>
              {copied ? '✅ Copiado!' : '📋 Copiar palavra-chave'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnOpenSIS} onPress={handleCopyAndOpen} activeOpacity={0.8}>
            <Text style={s.btnOpenSISText}>Copiar e abrir sistema de certificados ›</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.noKwCard}>
          <Text style={s.noKwIcon}>⏳</Text>
          <Text style={s.noKwTitle}>Nenhuma palavra-chave ativa</Text>
          <Text style={s.noKwSub}>
            A palavra-chave será exibida aqui no dia e horário configurado pelo evento.
            Volte durante o evento para obter seu certificado.
          </Text>
        </View>
      )}

      {/* Instrução */}
      <View style={s.instructionCard}>
        <Text style={s.instructionTitle}>Como funciona?</Text>
        <Text style={s.instructionStep}>1. Aguarde a palavra-chave ficar ativa nesta tela.</Text>
        <Text style={s.instructionStep}>2. Copie a palavra-chave.</Text>
        <Text style={s.instructionStep}>3. Acesse o sistema de certificados (botão acima).</Text>
        <Text style={s.instructionStep}>4. Cole a palavra-chave para gerar seu certificado.</Text>
      </View>

      {/* Atualizar manualmente */}
      <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()}>
        <Text style={s.refreshBtnText}>↻ Atualizar</Text>
      </TouchableOpacity>

      <Text style={s.footer}>UNIFAE · Intercurso</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f4ff' },
  content:     { padding: 20, paddingBottom: 40 },

  backBtn:     { marginBottom: 16 },
  backText:    { color: '#1d4ed8', fontSize: 14, fontWeight: '700' },

  titleArea:   { marginBottom: 20 },
  title:       { fontSize: 24, fontWeight: '900', color: '#111', marginBottom: 4 },
  subtitle:    { fontSize: 14, color: '#6b7280' },

  loadingBox:  { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },

  // Palavra-chave ativa
  kwCard:      { backgroundColor: '#1d4ed8', borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center', gap: 8 },
  kwBadge:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4 },
  kwBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  kwPalavra:   { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: 3, textAlign: 'center' },
  kwMeta:      { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 8 },
  btnCopy:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  btnCopyText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOpenSIS:  { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, width: '100%', alignItems: 'center', marginTop: 8 },
  btnOpenSISText: { color: '#1d4ed8', fontWeight: '800', fontSize: 14 },

  // Sem palavra-chave
  noKwCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 16, gap: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  noKwIcon:    { fontSize: 40 },
  noKwTitle:   { fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' },
  noKwSub:     { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  // Instrução
  instructionCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  instructionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  instructionStep:  { fontSize: 13, color: '#6b7280', marginBottom: 6, lineHeight: 20 },

  refreshBtn:     { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  refreshBtnText: { color: '#1d4ed8', fontSize: 14, fontWeight: '600' },

  footer:      { textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 16 },
});
