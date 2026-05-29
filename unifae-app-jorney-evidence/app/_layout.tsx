import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SideMenuProvider } from '../src/context/SideMenuContext';
import { setUnauthorizedHandler } from '../src/api/client';

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: '#0d631b' },
};

/** Guard de autenticação — roda DENTRO do Stack, depois do navigator estar pronto. */
function AuthGuard() {
  const { user, isLoading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Registrar handler de 401 → força re-login
  // Apenas chama signOut(); o AuthGuard detecta user=null e redireciona para /login.
  // Não chamamos router.replace aqui pois signOut() é async — se navegarmos antes
  // do estado atualizar, o AuthGuard vê "usuário na tela de login" e redireciona de volta.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });
  }, []);

  useEffect(() => {
    console.log('[AuthGuard] user:', user?.name ?? null, '| isLoading:', isLoading, '| segments:', segments);
    if (isLoading) return;

    const onLoginScreen = segments[0] === 'login';

    if (!user && !onLoginScreen) {
      console.log('[AuthGuard] Sem sessão → redirecionando para /login');
      router.replace('/login');
    } else if (user && onLoginScreen) {
      console.log('[AuthGuard] Sessão ativa na tela de login → redirecionando para /');
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  return null;
}

/** Tela de splash enquanto restaura sessão. */
function LoadingScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Text style={{ fontSize: 40, fontWeight: '900', color: '#0d631b', letterSpacing: 6 }}>
          UNIFAE
        </Text>
        <View style={{ width: 48, height: 3, backgroundColor: '#0d631b', borderRadius: 2, marginVertical: 10 }} />
        <Text style={{ fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>
          Jornada de Evidências{'\n'}e Mostra de Jogos
        </Text>
      </Animated.View>
      <ActivityIndicator size="large" color="#0d631b" style={{ marginTop: 48 }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <SideMenuProvider>
            <RootLayoutInner />
          </SideMenuProvider>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

/** Componente interno que pode usar useAuth (está dentro do AuthProvider). */
function RootLayoutInner() {
  const { isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
