import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider } from '../src/context/AuthContext';

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: '#0d631b' },
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
