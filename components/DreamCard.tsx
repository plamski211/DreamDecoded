import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';
import { getMoodGradient } from '@/lib/dreamAnalysis';
import { spacing, radius, fontSize as fs, elevation } from '@/lib/theme';
import type { Dream } from '@/types';
import MoodBadge from './MoodBadge';

interface DreamCardProps { dream: Dream; }

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return 'Yesterday';
  const now = new Date();
  if (now.getFullYear() === date.getFullYear()) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

export default function DreamCard({ dream }: DreamCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const primaryMood = dream.moods[0];
  const accentColor = primaryMood ? getMoodGradient(primaryMood.mood)[0] : c.accent;
  const primaryEmoji = primaryMood?.emoji;

  return (
    <Pressable
      onPress={() => router.push(`/dream/${dream.id}`)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: c.card, borderColor: c.border },
        elevation.sm,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Left mood accent strip — wider */}
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />

      {/* Mood tint overlay */}
      <View style={[styles.moodTint, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          {primaryEmoji && <Text style={styles.emoji}>{primaryEmoji}</Text>}
          <Text
            style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}
            numberOfLines={1}
          >
            {dream.title}
          </Text>
        </View>
        <Text style={[styles.date, { color: c.textTertiary, fontFamily: theme.fonts.caption }]}>
          {formatRelativeDate(dream.created_at)}
        </Text>
        <Text
          style={[styles.preview, { color: c.textSecondary, fontFamily: theme.fonts.body }]}
          numberOfLines={2}
        >
          {dream.summary || dream.transcription}
        </Text>
        {dream.moods.length > 0 && (
          <View style={styles.moods}>
            {dream.moods.slice(0, 3).map((mood, i) => (
              <MoodBadge key={i} mood={mood} compact />
            ))}
            {dream.symbols.length > 0 && (
              <View style={[styles.symbolHint, { backgroundColor: c.accentMuted }]}>
                <Text style={styles.symbolEmoji}>{dream.symbols[0].emoji}</Text>
                {dream.symbols.length > 1 && (
                  <Text style={[styles.symbolMore, { color: c.textTertiary, fontFamily: theme.fonts.caption }]}>
                    +{dream.symbols.length - 1}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentStrip: {
    width: 4,
  },
  moodTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.04,
  },
  content: {
    flex: 1,
    padding: spacing.md + 2,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 20,
  },
  title: { fontSize: fs.body, flex: 1 },
  date: { fontSize: fs.tiny },
  preview: { fontSize: fs.caption, marginTop: 2, lineHeight: fs.caption * 1.5 },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  symbolHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  symbolEmoji: { fontSize: 12 },
  symbolMore: { fontSize: fs.micro },
});
