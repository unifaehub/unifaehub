import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SideMenuProvider } from '../src/context/SideMenuContext';

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: '#0d631b' },
};

/** Guard de autenticação — roda DENTRO do Stack, depois do navigator estar pronto. */
function AuthGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#0d631b" />
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
