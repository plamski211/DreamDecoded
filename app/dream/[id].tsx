import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Play, Pause, Share2, Trash2, MessageCircle } from 'lucide-react-native';
import FadeInView from '@/components/FadeInView';
import AlertModal, { type AlertConfig } from '@/components/AlertModal';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
import { formatDuration } from '@/lib/dreamAnalysis';
import { useAppStore } from '@/lib/store';
import MoodBadge from '@/components/MoodBadge';
import SymbolChip from '@/components/SymbolChip';

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
  const waveHeights = useMemo(() => Array.from({ length: 20 }, () => 4 + Math.random() * 16), []);

  useEffect(() => { return () => { sound?.unloadAsync(); }; }, [sound]);

  const toggleAudio = useCallback(async () => {
    if (!dream?.audio_url) return;
    if (isPlaying && sound) { await sound.pauseAsync(); setIsPlaying(false); }
    else {
      try {
        if (sound) { await sound.playAsync(); }
        else { const { sound: newSound } = await Audio.Sound.createAsync({ uri: dream.audio_url }, { shouldPlay: true }, (status) => { if (status.isLoaded && status.didJustFinish) setIsPlaying(false); }); setSound(newSound); }
        setIsPlaying(true);
      } catch {}
    }
  }, [isPlaying, sound, dream]);

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
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><ArrowLeft size={24} color={c.text} strokeWidth={1.5} /></Pressable>
        <View style={styles.navActions}>
          <Pressable onPress={() => {}}><Share2 size={20} color={c.textSecondary} strokeWidth={1.5} /></Pressable>
          <Pressable onPress={handleDelete}><Trash2 size={20} color={c.error} strokeWidth={1.5} /></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView delay={100} style={styles.meta}>
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>{dream.title}</Text>
          <Text style={[styles.date, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>{format(new Date(dream.created_at), 'EEEE, MMMM d, yyyy · h:mm a')}</Text>
          {dream.moods.length > 0 && <View style={styles.moodRow}>{dream.moods.map((mood, i) => <MoodBadge key={i} mood={mood} />)}</View>}
        </FadeInView>
        <FadeInView delay={200} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Transcription</Text>
          <Text style={[styles.transcription, { color: c.text, fontFamily: theme.fonts.body }]}>{dream.transcription}</Text>
        </FadeInView>
        {dream.interpretation ? (
          <FadeInView delay={300}>
            <View style={[styles.interpretationCard, { backgroundColor: c.accentSubtle }]}>
              <View style={[styles.interpretationBorder, { backgroundColor: c.accent }]} />
              <View style={styles.interpretationContent}>
                <Text style={[styles.sectionTitle, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Interpretation</Text>
                <Text style={[styles.interpretation, { color: c.text, fontFamily: theme.fonts.body }]}>{dream.interpretation}</Text>
              </View>
            </View>
          </FadeInView>
        ) : null}
        {dream.symbols.length > 0 && (
          <FadeInView delay={400} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Symbols</Text>
            <View style={styles.symbolsGrid}>{dream.symbols.map((sym, i) => <SymbolChip key={i} symbol={sym} highlighted={sym.occurrence_count > 1} />)}</View>
          </FadeInView>
        )}
        <FadeInView delay={500}>
          <Pressable onPress={() => router.push(`/dream/${dream.id}/ask`)}>
            <View style={[styles.askCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <MessageCircle size={24} color={c.accent} strokeWidth={1.5} />
              <View style={styles.askContent}>
                <Text style={[styles.askTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Ask Your Dream</Text>
                <Text style={[styles.askSubtitle, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Have a conversation about what this dream means</Text>
              </View>
            </View>
          </Pressable>
        </FadeInView>
        {dream.audio_url && (
          <FadeInView delay={600} style={[styles.audioBar, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Pressable onPress={toggleAudio} style={[styles.playBtn, { backgroundColor: c.accent }]}>
              {isPlaying ? <Pause size={18} color={c.bg} strokeWidth={2} /> : <Play size={18} color={c.bg} strokeWidth={2} />}
            </Pressable>
            <View style={styles.audioInfo}>
              <View style={styles.audioWave}>
                {waveHeights.map((h, i) => <View key={i} style={[styles.waveBar, { height: h, backgroundColor: c.accent, opacity: 0.5 }]} />)}
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
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingVertical: spacing.sm },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxxl, gap: spacing.lg },
  meta: { gap: spacing.sm },
  title: { fontSize: fs.title },
  date: { fontSize: fs.caption },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  section: { gap: spacing.sm },
  sectionTitle: {},
  transcription: { fontSize: fs.body, lineHeight: fs.body * lineHeight.relaxed },
  interpretationCard: { flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden' },
  interpretationBorder: { width: 3 },
  interpretationContent: { flex: 1, padding: spacing.md, gap: spacing.sm },
  interpretation: { fontSize: fs.body, lineHeight: fs.body * lineHeight.relaxed },
  symbolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  askCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md },
  askContent: { flex: 1, gap: 2 },
  askTitle: { fontSize: fs.body },
  askSubtitle: { fontSize: fs.tiny },
  audioBar: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  playBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  audioInfo: { flex: 1, gap: spacing.xs },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  waveBar: { width: 3, borderRadius: 1.5 },
  audioDuration: { fontSize: fs.tiny },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: fs.body },
});
