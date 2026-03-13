import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Dream } from '@/types';
import FadeInView from '@/components/FadeInView';
import DreamReveal from '@/components/DreamReveal';
import StreakCelebration, { isMilestone } from '@/components/StreakCelebration';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, fontSize as fs, SCREEN_PADDING } from '@/lib/theme';
import { getGreeting, getMoodGradient } from '@/lib/dreamAnalysis';
import { processDream } from '@/lib/ai';
import { useAppStore } from '@/lib/store';
import { sendDreamProcessedNotification } from '@/lib/notifications';
import { hasCredentials, updateProfile } from '@/lib/supabase';
import MorningCircle from '@/components/MorningCircle';
import DreamCard from '@/components/DreamCard';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, themeKey } = useTheme();
  const c = theme.colors;
  const user = useAppStore((s) => s.user);
  const dreams = useAppStore((s) => s.dreams);
  const isRecording = useAppStore((s) => s.isRecording);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const setProcessing = useAppStore((s) => s.setProcessing);
  const addDream = useAppStore((s) => s.addDream);
  const setDecodedDream = useAppStore((s) => s.setDecodedDream);

  const [revealDream, setRevealDream] = useState<Dream | null>(null);
  const [celebrateStreak, setCelebrateStreak] = useState<number | null>(null);

  const greeting = getGreeting(themeKey, user?.name);
  const lastDream = dreams[0] ?? null;
  const streak = user?.streak_current ?? 0;

  // Contextual orb tint — based on recent dream moods
  const orbTintColor = useMemo(() => {
    if (dreams.length === 0) return undefined;
    const recentMood = dreams[0]?.moods[0]?.mood;
    if (!recentMood) return undefined;
    return getMoodGradient(recentMood)[0];
  }, [dreams]);

  const recurringSymbols = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of dreams) {
      for (const s of d.symbols) {
        const key = s.name.toLowerCase().trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).filter(([, n]) => n >= 2).map(([name]) => name);
  }, [dreams]);

  const handleDreamRecorded = useCallback(
    async (result: { uri: string; duration: number }) => {
      const userId = user?.id ?? 'local';
      const style = user?.interpretation_style ?? 'mixed';
      const voiceLanguage = user?.voice_language || undefined;

      setProcessing(true);
      try {
        const dream = await processDream(result.uri, userId, style, recurringSymbols, true, voiceLanguage);
        const fullDream = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          audio_duration_seconds: result.duration,
          art_style: null,
          ...dream,
        } as Dream;
        addDream(fullDream);
        setDecodedDream(fullDream);

        let newStreak = streak;
        if (user) {
          const today = new Date().toISOString().split('T')[0];
          const lastDate = user.last_dream_date?.split('T')[0] ?? '';
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (lastDate === yesterday) { newStreak = user.streak_current + 1; } else if (lastDate !== today) { newStreak = 1; }
          const newLongest = Math.max(user.streak_longest, newStreak);
          const streakUpdates = { streak_current: newStreak, streak_longest: newLongest, last_dream_date: new Date().toISOString() };
          useAppStore.getState().setUser({ ...user, ...streakUpdates });
          if (hasCredentials) updateProfile(user.id, streakUpdates).catch(() => {});
        }

        if (fullDream.title && Platform.OS !== 'web') {
          sendDreamProcessedNotification(fullDream.title).catch(() => {});
        }

        // Show dream reveal
        setRevealDream(fullDream);

        // Check for streak milestone celebration
        if (newStreak > 0 && isMilestone(newStreak)) {
          // Will show after reveal is dismissed
          setCelebrateStreak(newStreak);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Dream Recording', msg); }
      } finally {
        setProcessing(false);
      }
    },
    [user, recurringSymbols, streak]
  );

  const handleRevealDismiss = useCallback(() => {
    const dream = revealDream;
    setRevealDream(null);
    if (dream) {
      router.push(`/dream/${dream.id}`);
    }
    // Show streak celebration after a brief delay
    if (celebrateStreak) {
      setTimeout(() => {}, 300);
    }
  }, [revealDream, celebrateStreak, router]);

  const handleStreakComplete = useCallback(() => {
    setCelebrateStreak(null);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header — greeting and streak */}
      <FadeInView delay={100} style={styles.header}>
        <Text style={[styles.greeting, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>
          {greeting}
        </Text>
        {streak > 0 && (
          <View style={styles.streakRow}>
            <View style={[styles.streakDot, { backgroundColor: c.streak }]} />
            <Text style={[styles.streak, { color: c.streak, fontFamily: theme.fonts.body }]}>
              {streak} day streak
            </Text>
          </View>
        )}
      </FadeInView>

      {/* Center — the orb takes priority */}
      <View style={styles.circleArea}>
        <MorningCircle onDreamRecorded={handleDreamRecorded} tintColor={orbTintColor} />
        {!isProcessing && !isRecording && (
          <FadeInView delay={300} variant="fade">
            <Text style={[styles.hint, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>
              Tap to record your dream
            </Text>
          </FadeInView>
        )}
        {isProcessing && (
          <FadeInView delay={0} variant="fade">
            <Text style={[styles.hint, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Decoding your dream...</Text>
          </FadeInView>
        )}
      </View>

      {/* Last dream — below the fold, scrollable */}
      {lastDream && !isRecording && !isProcessing && (
        <FadeInView delay={500} variant="slide" style={styles.lastDream}>
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

      {/* Dream reveal overlay */}
      {revealDream && (
        <DreamReveal dream={revealDream} onDismiss={handleRevealDismiss} />
      )}

      {/* Streak celebration overlay */}
      {celebrateStreak && (
        <StreakCelebration streak={celebrateStreak} onComplete={handleStreakComplete} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING },
  header: { paddingTop: spacing.lg, gap: spacing.xs },
  greeting: { fontSize: fs.title },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streakDot: { width: 6, height: 6, borderRadius: 3 },
  streak: { fontSize: fs.caption },
  circleArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: fs.caption, marginTop: spacing.md },
  lastDream: { paddingBottom: spacing.lg, gap: spacing.sm },
  lastDreamLabel: {},
});
