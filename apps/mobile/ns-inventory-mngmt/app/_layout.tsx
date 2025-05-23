import { Translations } from '@/constants/Translations';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import Constants from "expo-constants";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform } from "react-native";
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useSyncQueriesExternal } from "react-query-external-sync";




export default function RootLayout() {

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  })
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  const hostIP =
    Constants.expoGoConfig?.debuggerHost?.split(`:`)[0] ||
    Constants.expoConfig?.hostUri?.split(`:`)[0];

  function AppContent() {
    const colorScheme = useColorScheme();
    // Set up the sync hook - automatically disabled in production!
    useSyncQueriesExternal({
      queryClient,
      socketURL: `http://${hostIP}:42831`, // Use local network IP
      deviceName: Platform?.OS || "web", // Platform detection
      platform: Platform?.OS || "web", // Use appropriate platform identifier
      deviceId: Platform?.OS || "web", // Use a PERSISTENT identifier (see note below)
      extraDeviceInfo: {
        // Optional additional info about your device
        appVersion: "1.0.0",
        // Add any relevant platform info
      },
      enableLogs: false,
    });

    // Your app content
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" options={{ title: Translations.navigation.notFound }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (

    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}


