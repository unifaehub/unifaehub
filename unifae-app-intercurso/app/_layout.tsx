import { useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,   // 1 minuto — app público, dados mudam pouco
      retry: 2,
    },
  },
});

/** Paleta azul do Intercurso (vs. verde da Jornada). */
const theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: '#1d4ed8' },
};

/** Splash animado enquanto o app inicializa. */
function SplashScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Text style={{ fontSize: 40, fontWeight: '900', color: '#1d4ed8', letterSpacing: 6 }}>
          UNIFAE
        </Text>
        <View style={{ width: 48, height: 3, backgroundColor: '#1d4ed8', borderRadius: 2, marginVertical: 10 }} />
        <Text style={{ fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>
          Intercurso
        </Text>
      </Animated.View>
      <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 48 }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        {/* App público — sem AuthProvider nem guard de sessão */}
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}
