import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
} from '@expo-google-fonts/eb-garamond';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';
import { supabase, hasCredentials, fetchDreams } from '@/lib/supabase';
import { initDB, loadDreams as loadLocalDreams } from '@/lib/storage';
import { useAppStore } from '@/lib/store';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAppStore((s) => s.session);
  const user = useAppStore((s) => s.user);
  const isAuthLoading = useAppStore((s) => s.isAuthLoading);

  useEffect(() => {
    if (isAuthLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && user && !user.onboarding_completed && !inOnboarding) {
      router.replace('/onboarding');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, user, isAuthLoading, segments]);
}

function RootLayoutInner() {
  const { isDark, theme } = useTheme();
  const setSession = useAppStore((s) => s.setSession);
  const setUser = useAppStore((s) => s.setUser);
  const setAuthLoading = useAppStore((s) => s.setAuthLoading);
  const setDreams = useAppStore((s) => s.setDreams);

  // Always load local data first — fast, offline, no auth required
  useEffect(() => {
    initDB()
      .then(() => loadLocalDreams())
      .then((local) => { if (local.length > 0) setDreams(local); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasCredentials) {
      setAuthLoading(false);
      return;
    }

    async function loadUserData(userId: string): Promise<void> {
      const [profileResult, dreams] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        fetchDreams(userId),
      ]);
      if (profileResult.data) setUser(profileResult.data);
      if (dreams.length > 0) setDreams(dreams);
    }

    let subscription: { unsubscribe: () => void } | undefined;
    let resolved = false;

    const resolve = () => {
      if (!resolved) {
        resolved = true;
        setAuthLoading(false);
      }
    };

    // Supabase v2: onAuthStateChange always fires INITIAL_SESSION first (from storage),
    // before getSession() resolves. Using it as the single initialization gate prevents
    // the race condition where getSession() returns null on first page load.
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          if (session) {
            setSession({ access_token: session.access_token });
            try { await loadUserData(session.user.id); } catch {}
          }
          resolve();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session) {
            setSession({ access_token: session.access_token });
            try { await loadUserData(session.user.id); } catch {}
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      });
      subscription = data.subscription;
    } catch { resolve(); }

    // Safety fallback: if INITIAL_SESSION never fires (shouldn't happen in Supabase v2),
    // unblock auth loading after 5 seconds so the app doesn't hang.
    const timeout = setTimeout(resolve, 5000);

    return () => {
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  useProtectedRoute();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dream/[id]" />
        <Stack.Screen name="dream/[id]/ask" options={{ presentation: 'modal' }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
    'EBGaramond-Regular': EBGaramond_400Regular,
    'EBGaramond-Italic': EBGaramond_400Regular_Italic,
    'EBGaramond-Medium': EBGaramond_500Medium,
    'SpaceMono-Regular': SpaceMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => {});
      }
    }
  }, [fontsLoaded, fontError]);

  if (!appReady) return null;

  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
