import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@/constants/theme';
import { Keyboard, Platform, AppState, LogBox } from 'react-native';
import 'react-native-url-polyfill/auto'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  useFrameworkReady();
  // Suppress known warnings for Expo SDK 53
  useEffect(() => {
    LogBox.ignoreLogs([
      'TurboModuleRegistry.getEnforcing(...): \'PlatformConstants\' could not be found',
      'Module RCTImageLoader requires main queue setup',
      'Require cycle:',
    ]);
  }, []);

  useEffect(() => {
    window.frameworkReady?.();
    
    // Ensure keyboard is dismissed when app starts
    Keyboard.dismiss();
    
    // Listen for app state changes to dismiss keyboard when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        Keyboard.dismiss();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}