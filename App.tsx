import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import AuthScreen from './src/screens/AuthScreen';
import { useStore } from './src/store/useStore';
import { colors, family, font, spacing } from './src/theme';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

function Splash() {
  return (
    <View style={styles.splash}>
      <View style={styles.mark}>
        <Text style={styles.markText}>PR</Text>
      </View>
      <Text style={styles.brand}>PROGRESSIVE</Text>
      <Text style={styles.tagline}>TRAINING LOG</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

function AppContent() {
  const { session, loading } = useAuth();
  const hydrated = useStore((s) => s.hydrated);
  const loadFromServer = useStore((s) => s.loadFromServer);
  const resetLocal = useStore((s) => s.resetLocal);
  const setUserId = useStore((s) => s.setUserId);

  // `booted` tracks the per-session data load so we don't flash one account's
  // cached data while another's is loading (or after sign-out).
  const [booted, setBooted] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let cancelled = false;
    setBooted(false);
    if (!userId) {
      resetLocal();
      setBooted(true);
      return;
    }
    loadFromServer(userId)
      .catch((err) => {
        console.warn('[app] loadFromServer failed:', err?.message ?? err);
        // The load failed (typically offline). Only discard the cache on a live
        // switch to a *different* account — never show the wrong user's data.
        // loadFromServer leaves store.userId untouched when it throws, so a null
        // id means a cold boot and an equal id means a refresh of the same
        // account: either way the rehydrated cache belongs to this user, so keep
        // it (an in-progress workout survives an offline reopen) and adopt the id
        // so writes made offline still queue for the next sync.
        const cachedOwner = useStore.getState().userId;
        if (cachedOwner !== null && cachedOwner !== userId) resetLocal();
        else setUserId(userId);
      })
      .finally(() => {
        if (!cancelled) setBooted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, loadFromServer, resetLocal, setUserId]);

  const ready = hydrated && !loading && booted;

  if (!ready) return <Splash />;
  if (!session) return <AuthScreen />;
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {fontsLoaded ? (
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        ) : (
          <Splash />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: colors.bg,
    fontSize: 40,
    lineHeight: 46,
    fontFamily: family.display,
    includeFontPadding: false,
    marginTop: 6,
  },
  brand: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: family.display,
    includeFontPadding: false,
    letterSpacing: 2,
    marginTop: spacing.lg,
  },
  tagline: {
    color: colors.primary,
    fontSize: font.tiny,
    fontFamily: family.medium,
    letterSpacing: 4,
    marginTop: 2,
  },
});
