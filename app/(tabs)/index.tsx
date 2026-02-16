import { useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FadeInView from '@/components/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
import { getGreeting } from '@/lib/dreamAnalysis';
import { processDream } from '@/lib/ai';
import { useAppStore } from '@/lib/store';
import { sendDreamProcessedNotification } from '@/lib/notifications';
import { loadPreference } from '@/lib/storage';
import { hasCredentials, updateProfile } from '@/lib/supabase';
import MorningCircle from '@/components/MorningCircle';
import DreamCard from '@/components/DreamCard';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, themeKey } = useTheme();
  const c = theme.colors;
  const user = useAppStore((s) => s.user);
  const dreams = useAppStore((s) => s.dreams);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const setProcessing = useAppStore((s) => s.setProcessing);
  const addDream = useAppStore((s) => s.addDream);
  const setDecodedDream = useAppStore((s) => s.setDecodedDream);

  const greeting = getGreeting(themeKey, user?.name);
  const lastDream = dreams[0] ?? null;
  const streak = user?.streak_current ?? 0;

  const handleDreamRecorded = useCallback(
    async (result: { uri: string; duration: number }) => {
      const userId = user?.id ?? 'local';
      const style = user?.interpretation_style ?? 'mixed';
      const symbolCounts = new Map<string, number>();
      for (const d of dreams) {
        for (const s of d.symbols) {
          const key = s.name.toLowerCase().trim();
          symbolCounts.set(key, (symbolCounts.get(key) ?? 0) + 1);
        }
      }
      const recurringSymbols = Array.from(symbolCounts.entries())
        .filter(([, count]) => count >= 2)
        .map(([name]) => name);

      let voiceLanguage: string | null = null;
      try { voiceLanguage = await loadPreference('voice_language'); } catch {}

      setProcessing(true);
      try {
        const dream = await processDream(result.uri, userId, style, recurringSymbols, true, voiceLanguage ?? undefined);
        const fullDream = { id: crypto.randomUUID(), created_at: new Date().toISOString(), audio_duration_seconds: result.duration, ...dream } as any;
        addDream(fullDream);
        setDecodedDream(fullDream);

        if (user) {
          const today = new Date().toISOString().split('T')[0];
          const lastDate = user.last_dream_date?.split('T')[0] ?? '';
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          let newStreak = user.streak_current;
          if (lastDate === yesterday) { newStreak += 1; } else if (lastDate !== today) { newStreak = 1; }
          const newLongest = Math.max(user.streak_longest, newStreak);
          const streakUpdates = { streak_current: newStreak, streak_longest: newLongest, last_dream_date: new Date().toISOString() };
          useAppStore.getState().setUser({ ...user, ...streakUpdates });
          if (hasCredentials) updateProfile(user.id, streakUpdates).catch(() => {});
        }

        if (fullDream.title && Platform.OS !== 'web') {
          sendDreamProcessedNotification(fullDream.title).catch(() => {});
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const msg = `Failed to process your dream:\n\n${detail}`;
        if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Processing Error', msg); }
      } finally {
        setProcessing(false);
      }
    },
    [user, dreams]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <FadeInView delay={100} style={styles.header}>
        <Text style={[styles.greeting, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>
          {greeting}
        </Text>
        {streak > 0 && (
          <Text style={[styles.streak, { color: c.streak, fontFamily: theme.fonts.body }]}>
            {streak} day streak
          </Text>
        )}
      </FadeInView>

      <View style={styles.circleArea}>
        <MorningCircle onDreamRecorded={handleDreamRecorded} />
        {!isProcessing && (
          <FadeInView delay={300}>
            <Text style={[styles.hint, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>
              Tap to record your dream
            </Text>
          </FadeInView>
        )}
        {isProcessing && (
          <Text style={[styles.hint, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Decoding your dream...</Text>
        )}
      </View>

      {lastDream && (
        <FadeInView delay={500} style={styles.lastDream}>
          <Text style={[styles.lastDreamLabel, {
            color: c.textTertiary,
            fontFamily: theme.fonts.caption,
            letterSpacing: theme.labelStyle.letterSpacing,
            textTransform: theme.labelStyle.textTransform,
            fontSize: theme.labelStyle.fontSize,
          }]}>
            Latest Dream
          </Text>
          <DreamCard dream={lastDream} />
        </FadeInView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING },
  header: { paddingTop: spacing.md, gap: spacing.xs },
  greeting: { fontSize: fs.heading },
  streak: { fontSize: fs.caption },
  circleArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: fs.caption, marginTop: spacing.sm },
  lastDream: { paddingBottom: spacing.lg, gap: spacing.sm },
  lastDreamLabel: {},
});
