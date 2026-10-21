/**
 * Module: Application Root Entrypoint
 * Responsibility: Initializes the top-level React Native provider hierarchy:
 * - SafeAreaProvider for notch and home indicator bounds
 * - ThemeProvider for dynamic light/dark style tokens
 * - AuthProvider for session lifecycle management
 * - Dynamic StatusBar styling
 */

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/hooks/useAuth';
import { RootNavigator } from './src/navigation/RootNavigator';

function ThemedApp() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
