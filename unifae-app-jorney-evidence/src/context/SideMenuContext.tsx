import React, { createContext, useContext, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, Pressable, StyleSheet, Text,
  TouchableOpacity, View, Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { jornadaApi } from '../api/jornada';
import { useAuth } from './AuthContext';

const KEYWORD_URL = 'https://sis.fae.br:8080/eventos';

const W = Dimensions.get('window').width;
const MENU_W = Math.min(W * 0.78, 300);

type SideMenuContextType = { openMenu: () => void };
const SideMenuContext = createContext<SideMenuContextType>({ openMenu: () => {} });

export function useSideMenu() {
  return useContext(SideMenuContext);
}

export function SideMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const slideX = useRef(new Animated.Value(-MENU_W)).current;
  const { user, signOut } = useAuth();

  const { data: keyword, refetch: refetchKeyword } = useQuery({
    queryKey: ['keyword'],
    queryFn: jornadaApi.getCurrentKeyword,
    enabled: visible,
  });

  const [copied, setCopied] = useState(false);

  async function handleKeywordPress() {
    if (!keyword) return;
    await Clipboard.setStringAsync(keyword.palavra);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Linking.openURL(KEYWORD_URL).catch(() => {});
  }

  function openMenu() {
    setVisible(true);
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 12 }).start();
  }

  function closeMenu() {
    Animated.timing(slideX, { toValue: -MENU_W, duration: 220, useNativeDriver: true }).start(() =>
      setVisible(false),
    );
  }

  return (
    <SideMenuContext.Provider value={{ openMenu }}>
      {children}
      <Modal transparent visible={visible} animationType="none" onRequestClose={closeMenu}>
        {/* Overlay escuro */}
        <Pressable style={styles.overlay} onPress={closeMenu} />

        {/* Painel deslizante */}
        <Animated.View style={[styles.panel, { transform: [{ translateX: slideX }] }]}>
          {/* Cabeçalho do usuário */}
          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.name ?? '—'}</Text>
              <Text style={styles.userRole}>Professor</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Palavra-chave */}
          <View style={styles.keywordSection}>
            <Text style={styles.menuSectionLabel}>🔑 Palavra-Chave Atual</Text>
            {keyword ? (
              <TouchableOpacity
                style={[styles.keywordBox, styles.keywordBoxClickable]}
                onPress={handleKeywordPress}
                activeOpacity={0.75}
              >
                <Text style={styles.keywordText}>{keyword.palavra}</Text>
                <Text style={styles.keywordSub}>
                  {new Date(keyword.dataAgendamento + 'T00:00:00').toLocaleDateString('pt-BR')} às {keyword.horaInicio}
                </Text>
                <View style={styles.keywordAction}>
                  <Text style={styles.keywordActionText}>
                    {copied ? '✅ Copiado!' : '📋 Toque para copiar e abrir SIS'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.keywordEmpty}>Nenhuma palavra-chave ativa.</Text>
            )}
            <TouchableOpacity style={styles.refreshBtn} onPress={() => refetchKeyword()}>
              <Text style={styles.refreshBtnText}>↻ Atualizar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { closeMenu(); signOut(); }}>
            <Text style={styles.logoutText}>🚪 Sair</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SideMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: MENU_W,
    backgroundColor: '#fff', paddingTop: 56, shadowColor: '#000',
    shadowOpacity: .18, shadowRadius: 16, elevation: 12,
  },
  userHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  avatar:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0d631b', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 20, fontWeight: '800' },
  userName:     { fontSize: 16, fontWeight: '700', color: '#111' },
  userRole:     { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider:      { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
  keywordSection: { padding: 20 },
  menuSectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  keywordBox:         { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  keywordBoxClickable:{ borderWidth: 1.5, borderColor: '#86efac' },
  keywordText:        { fontSize: 22, fontWeight: '800', color: '#0d631b' },
  keywordSub:         { fontSize: 11, color: '#6b7280', marginTop: 4 },
  keywordAction:      { marginTop: 8, backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  keywordActionText:  { fontSize: 11, color: '#166534', fontWeight: '600' },
  keywordEmpty:       { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  refreshBtn:   { alignSelf: 'flex-start', paddingVertical: 4 },
  refreshBtnText: { color: '#0d631b', fontSize: 13, fontWeight: '600' },
  logoutBtn:    { padding: 20 },
  logoutText:   { fontSize: 15, color: '#dc2626', fontWeight: '600' },
});
