import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { loginJornada } from '../src/api/auth';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const { setUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      setError('Preencha o identificador e a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await loginJornada(identifier.trim(), password);
      setUser(user);
      router.replace('/');
    } catch (err: any) {
      const msg    = err?.response?.data?.message ?? 'Verifique suas credenciais e tente novamente.';
      const status = err?.response?.status;
      if (status === 401 || status === 400) {
        setError(msg);
      } else {
        setError('Não foi possível conectar ao servidor. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Marca */}
        <View style={styles.brand}>
          <Text style={styles.logo}>UNIFAE</Text>
          <Text style={styles.subtitle}>Jornada de Evidências{'\n'}e Mostra de Jogos</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Acesso</Text>

          <Text style={styles.label}>Registro Funcional ou RA</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Ex.: 100001"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Desenvolvido por MR 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: '#f0f7f0' },
  scroll:      { flexGrow: 1, justifyContent: 'flex-start', padding: 28, paddingTop: 80 },
  brand:       { alignItems: 'center', marginBottom: 32 },
  logo:        { fontSize: 40, fontWeight: '900', color: '#0d631b', letterSpacing: 4 },
  subtitle:    { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 6, lineHeight: 22 },
  form:        { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: .08, shadowRadius: 12, elevation: 4 },
  formTitle:   { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input:       { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111' },
  errorBox:    { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginTop: 12 },
  errorText:   { color: '#dc2626', fontSize: 13, textAlign: 'center' },
  button:      { backgroundColor: '#0d631b', borderRadius: 10, padding: 14, marginTop: 20, alignItems: 'center' },
  buttonText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer:      { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 24 },
});
