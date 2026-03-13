import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Play, Pause, Share2, Trash2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import FadeInView from '@/components/FadeInView';
import AlertModal, { type AlertConfig } from '@/components/AlertModal';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING, elevation } from '@/lib/theme';
import { formatDuration, getMoodGradient } from '@/lib/dreamAnalysis';
import { useAppStore } from '@/lib/store';
import MoodBadge from '@/components/MoodBadge';
import SymbolChip from '@/components/SymbolChip';

const TRANSCRIPTION_PREVIEW_LINES = 4;

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const dreams = useAppStore((s) => s.dreams);
  const removeDream = useAppStore((s) => s.removeDream);
  const dream = dreams.find((d) => d.id === id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [transcriptionExpanded, setTranscriptionExpanded] = useState(false);
  const waveHeights = useMemo(() => Array.from({ length: 20 }, () => 4 + Math.random() * 16), []);

  // Mood tint color
  const primaryMood = dream?.moods[0];
  const moodColor = primaryMood ? getMoodGradient(primaryMood.mood)[0] : c.accent;

  // Check if transcription is long enough to need collapsing
  const transcriptionIsLong = (dream?.transcription?.length ?? 0) > 300;

  useEffect(() => { return () => { sound?.unloadAsync(); }; }, [sound]);

  const toggleAudio = useCallback(async () => {
    if (!dream?.audio_url) return;
    if (isPlaying && sound) { await sound.pauseAsync(); setIsPlaying(false); }
    else {
      try {
        if (sound) { await sound.playAsync(); }
        else {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: dream.audio_url },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded && status.didJustFinish) {
                setIsPlaying(false);
                newSound.unloadAsync().catch(() => {});
                setSound(null);
              }
            }
          );
          setSound(newSound);
        }
        setIsPlaying(true);
      } catch {}
    }
  }, [isPlaying, sound, dream]);

  const handleShare = useCallback(async () => {
    if (!dream) return;
    const text = [dream.title, dream.summary, dream.interpretation].filter(Boolean).join('\n\n');
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: dream.title, text }).catch(() => {});
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text).catch(() => {});
      }
    } else {
      await Share.share({ title: dream.title, message: text }).catch(() => {});
    }
  }, [dream]);

  const handleDelete = () => {
    setAlertConfig({
      title: 'Delete Dream',
      message: 'Are you sure? This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { if (id) removeDream(id); router.back(); } },
      ],
    });
    setAlertVisible(true);
  };

  if (!dream) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><ArrowLeft size={24} color={c.text} strokeWidth={1.5} /></Pressable>
        <View style={styles.notFound}><Text style={[styles.notFoundText, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Dream not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Mood tint at top */}
      <View style={[styles.moodTintBar, { backgroundColor: moodColor }]} />

      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><ArrowLeft size={24} color={c.text} strokeWidth={1.5} /></Pressable>
        <View style={styles.navActions}>
          <Pressable onPress={handleShare} hitSlop={8}><Share2 size={20} color={c.textSecondary} strokeWidth={1.5} /></Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}><Trash2 size={20} color={c.error} strokeWidth={1.5} /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero zone — more breathing room */}
        <FadeInView delay={100} variant="fade" style={styles.hero}>
          {primaryMood && (
            <Text style={styles.heroEmoji}>{primaryMood.emoji}</Text>
          )}
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>{dream.title}</Text>
          <Text style={[styles.date, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>{format(new Date(dream.created_at), 'EEEE, MMMM d, yyyy · h:mm a')}</Text>
          {dream.moods.length > 0 && (
            <FadeInView delay={200} variant="fade">
              <View style={styles.moodRow}>
                {dream.moods.map((mood, i) => <MoodBadge key={i} mood={mood} />)}
              </View>
            </FadeInView>
          )}
        </FadeInView>

        {/* Interpretation — elevated as primary content */}
        {dream.interpretation ? (
          <FadeInView delay={250} variant="slide">
            <View style={[styles.interpretationCard, { backgroundColor: c.accentSubtle }]}>
              <View style={[styles.interpretationBorder, { backgroundColor: moodColor }]} />
              <View style={styles.interpretationContent}>
                <Text style={[styles.sectionTitle, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Interpretation</Text>
                <Text style={[styles.interpretation, { color: c.text, fontFamily: theme.fonts.body }]}>{dream.interpretation}</Text>
              </View>
            </View>
          </FadeInView>
        ) : null}

        {/* Summary */}
        {dream.summary ? (
          <FadeInView delay={300} variant="slide" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Summary</Text>
            <Text style={[styles.summary, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>{dream.summary}</Text>
          </FadeInView>
        ) : null}

        {/* Transcription — collapsible */}
        <FadeInView delay={350} variant="slide" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Transcription</Text>
          <Text
            style={[styles.transcription, { color: c.text, fontFamily: theme.fonts.body }]}
            numberOfLines={!transcriptionExpanded && transcriptionIsLong ? TRANSCRIPTION_PREVIEW_LINES : undefined}
          >
            {dream.transcription}
          </Text>
          {transcriptionIsLong && (
            <Pressable
              onPress={() => setTranscriptionExpanded(!transcriptionExpanded)}
              style={styles.expandBtn}
              hitSlop={8}
            >
              {transcriptionExpanded ? (
                <ChevronUp size={16} color={c.accent} strokeWidth={1.5} />
              ) : (
                <ChevronDown size={16} color={c.accent} strokeWidth={1.5} />
              )}
              <Text style={[styles.expandText, { color: c.accent, fontFamily: theme.fonts.body }]}>
                {transcriptionExpanded ? 'Show less' : 'Show more'}
              </Text>
            </Pressable>
          )}
        </FadeInView>

        {/* Symbols */}
        {dream.symbols.length > 0 && (
          <FadeInView delay={400} variant="slide" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Symbols</Text>
            <View style={styles.symbolsGrid}>{dream.symbols.map((sym, i) => <SymbolChip key={i} symbol={sym} highlighted={sym.occurrence_count > 1} />)}</View>
          </FadeInView>
        )}

        {/* Ask Your Dream */}
        <FadeInView delay={450} variant="scale">
          <Pressable
            onPress={() => router.push(`/dream/${dream.id}/ask`)}
            style={({ pressed }) => [
              styles.askCard,
              { backgroundColor: c.card, borderColor: c.border },
              elevation.sm,
              pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
            ]}
          >
            <View style={[styles.askIconWrap, { backgroundColor: c.accentMuted }]}>
              <MessageCircle size={22} color={c.accent} strokeWidth={1.5} />
            </View>
            <View style={styles.askContent}>
              <Text style={[styles.askTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Ask Your Dream</Text>
              <Text style={[styles.askSubtitle, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Have a conversation about what this dream means</Text>
            </View>
          </Pressable>
        </FadeInView>

        {/* Audio Player */}
        {dream.audio_url && (
          <FadeInView delay={500} variant="slide" style={[styles.audioBar, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Pressable onPress={toggleAudio} style={[styles.playBtn, { backgroundColor: c.accent }]}>
              {isPlaying ? <Pause size={18} color={c.bg} strokeWidth={2} /> : <Play size={18} color={c.bg} strokeWidth={2} />}
            </Pressable>
            <View style={styles.audioInfo}>
              <View style={styles.audioWave}>
                {waveHeights.map((h, i) => <View key={i} style={[styles.waveBar, { height: h, backgroundColor: moodColor, opacity: 0.5 }]} />)}
              </View>
              <Text style={[styles.audioDuration, { color: c.textTertiary, fontFamily: theme.fonts.mono }]}>{formatDuration(dream.audio_duration_seconds)}</Text>
            </View>
          </FadeInView>
        )}
      </ScrollView>
      <AlertModal visible={alertVisible} config={alertConfig} onDismiss={() => setAlertVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  moodTintBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, opacity: 0.06 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navActions: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxxl },

  // Hero zone
  hero: { paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  heroEmoji: { fontSize: 40, marginBottom: spacing.xs },
  title: { fontSize: fs.title, lineHeight: fs.title * lineHeight.tight },
  date: { fontSize: fs.caption },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },

  // Content sections
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionTitle: {},
  transcription: { fontSize: fs.body, lineHeight: fs.body * lineHeight.relaxed },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
  expandText: { fontSize: fs.caption },
  summary: { fontSize: fs.body, lineHeight: fs.body * lineHeight.relaxed },

  // Interpretation — elevated card
  interpretationCard: { flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xl },
  interpretationBorder: { width: 4 },
  interpretationContent: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  interpretation: { fontSize: fs.body, lineHeight: fs.body * lineHeight.relaxed },

  // Symbols
  symbolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Ask card
  askCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, marginBottom: spacing.xl },
  askIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  askContent: { flex: 1, gap: 3 },
  askTitle: { fontSize: fs.body },
  askSubtitle: { fontSize: fs.tiny },

  // Audio
  audioBar: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  playBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  audioInfo: { flex: 1, gap: spacing.xs },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  waveBar: { width: 3, borderRadius: 1.5 },
  audioDuration: { fontSize: fs.tiny },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: fs.body },
});
