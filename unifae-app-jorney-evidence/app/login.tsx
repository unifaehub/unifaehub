import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { loginJornada } from '../src/api/auth';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const { setUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      setError('Preencha o identificador e a senha.');
      return;
    }

    console.log('[Login] Iniciando handleLogin:', { identifier: identifier.trim() });
    setLoading(true);
    setError(null);

    try {
      const user = await loginJornada(identifier.trim(), password);
      console.log('[Login] Sucesso, redirecionando para home. User:', user);
      setUser(user);
      router.replace('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao fazer login. Verifique suas credenciais.';
      const status = err?.response?.status;
      console.error('[Login] Erro:', status, msg);
      setError(`[${status ?? 'ERR'}] ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>UNIFAE</Text>
      <Text style={styles.subtitle}>Jornada de Evidências</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Registro Funcional ou RA</Text>
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Ex.: 100001"
          autoCapitalize="none"
          keyboardType="default"
          autoCorrect={false}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Sua senha"
          secureTextEntry
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        {/* Debug info — remover em produção */}
        <Text style={styles.debugHint}>
          API: {process.env.EXPO_PUBLIC_API_BASE ?? 'localhost:3000'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f7f0', justifyContent: 'center', padding: 28 },
  logo:        { fontSize: 36, fontWeight: '800', color: '#0d631b', textAlign: 'center', marginBottom: 4 },
  subtitle:    { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 36 },
  form:        { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: .08, shadowRadius: 12, elevation: 4 },
  label:       { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input:       { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111' },
  errorBox:    { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginTop: 12 },
  errorText:   { color: '#dc2626', fontSize: 13, textAlign: 'center' },
  button:      { backgroundColor: '#0d631b', borderRadius: 10, padding: 14, marginTop: 20, alignItems: 'center' },
  buttonText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  debugHint:   { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
});
