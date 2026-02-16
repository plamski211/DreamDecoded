import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp, Repeat, FileText, Link2, AlertCircle } from 'lucide-react-native';
import FadeInView from '@/components/FadeInView';
import Svg, { Circle } from 'react-native-svg';
import { subDays, isAfter, format } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
import { useAppStore } from '@/lib/store';
import SymbolChip from '@/components/SymbolChip';
import PatternAlertCard from '@/components/PatternAlert';
import type { PatternAlert, Dream } from '@/types';

async function generateWeeklyReport(recentDreams: Dream[]): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!key) return 'Set EXPO_PUBLIC_GEMINI_API_KEY to generate weekly reports.';
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const dreamSummaries = recentDreams
    .map((d, i) => {
      const symbols = d.symbols.map((s) => s.name).join(', ');
      const moods = d.moods.map((m) => m.mood).join(', ');
      return `Dream ${i + 1} (${format(new Date(d.created_at), 'EEE')}): "${d.title}" — ${d.summary} [Moods: ${moods}] [Symbols: ${symbols}]`;
    })
    .join('\n');
  const prompt = `You are a dream analyst. Based on these ${recentDreams.length} dreams from the past week, write a brief (3-5 sentence) weekly dream report. Identify overall themes, emotional patterns, and what the dreamer's subconscious might be processing. Be warm and insightful.\n\n${dreamSummaries}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export default function InsightsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const dreams = useAppStore((s) => s.dreams);
  const [weeklyReport, setWeeklyReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const totalDreams = dreams.length;
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentDreams = dreams.filter((d) => isAfter(new Date(d.created_at), sevenDaysAgo));

  const healthScore = useMemo(() => {
    if (totalDreams === 0) return 0;
    const recentDays = new Set(recentDreams.map((d) => format(new Date(d.created_at), 'yyyy-MM-dd')));
    const frequencyScore = Math.min(recentDays.size / 7, 1);
    const uniqueMoods = new Set(dreams.flatMap((d) => d.moods.map((m) => m.mood)));
    const diversityScore = Math.min(uniqueMoods.size / 5, 1);
    const volumeScore = Math.min(totalDreams / 20, 1);
    const raw = frequencyScore * 50 + diversityScore * 30 + volumeScore * 20;
    return Math.round(Math.min(100, Math.max(5, raw)));
  }, [dreams, totalDreams, recentDreams]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const { recurringSymbols, symbolMap } = useMemo(() => {
    const sMap = new Map<string, { symbol: any; count: number; dreamIds: string[] }>();
    for (const dream of dreams) {
      for (const sym of dream.symbols) {
        const key = sym.name.toLowerCase().trim();
        const existing = sMap.get(key);
        if (existing) { existing.count += 1; if (!existing.dreamIds.includes(dream.id)) existing.dreamIds.push(dream.id); }
        else { sMap.set(key, { symbol: { ...sym, name: key, occurrence_count: 1 }, count: 1, dreamIds: [dream.id] }); }
      }
    }
    const symbols = Array.from(sMap.values()).map(({ symbol, count }) => ({ ...symbol, occurrence_count: count })).sort((a: any, b: any) => b.occurrence_count - a.occurrence_count).slice(0, 8);
    return { recurringSymbols: symbols, symbolMap: sMap };
  }, [dreams]);

  const dreamConnections = useMemo(() => {
    const connections: { symbol: string; emoji: string; dreams: { id: string; title: string }[] }[] = [];
    for (const [name, entry] of symbolMap) {
      if (entry.dreamIds.length >= 2) {
        connections.push({ symbol: name, emoji: entry.symbol.emoji, dreams: entry.dreamIds.map((id) => { const d = dreams.find((dr) => dr.id === id); return { id, title: d?.title ?? 'Untitled' }; }) });
      }
    }
    return connections.sort((a, b) => b.dreams.length - a.dreams.length).slice(0, 5);
  }, [symbolMap, dreams]);

  const patternAlerts = useMemo(() => {
    const alerts: PatternAlert[] = [];
    for (const [name, entry] of symbolMap) {
      if (entry.count >= 3) {
        alerts.push({ id: `recurring-${name}`, user_id: 'local', type: 'recurring_symbol', title: `Recurring: ${entry.symbol.emoji} ${name}`, description: `"${name}" has appeared in ${entry.count} of your dreams. This symbol may represent something significant in your life right now.`, related_dream_ids: entry.dreamIds, created_at: new Date().toISOString(), is_read: false });
      }
    }
    if (dreams.length >= 6) {
      const recent3 = dreams.slice(0, 3);
      const prev3 = dreams.slice(3, 6);
      const getDominant = (ds: Dream[]) => { const counts: Record<string, number> = {}; ds.forEach((d) => d.moods.forEach((m) => { counts[m.mood] = (counts[m.mood] || 0) + 1; })); return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]; };
      const recentMood = getDominant(recent3);
      const prevMood = getDominant(prev3);
      if (recentMood && prevMood && recentMood !== prevMood) {
        alerts.push({ id: 'mood-shift', user_id: 'local', type: 'mood_shift', title: 'Mood Shift Detected', description: `Your dreams shifted from predominantly "${prevMood}" to "${recentMood}". This could reflect a change in your waking emotional state.`, related_dream_ids: recent3.map((d) => d.id), created_at: new Date().toISOString(), is_read: false });
      }
    }
    return alerts;
  }, [symbolMap, dreams]);

  const handleViewReport = useCallback(async () => {
    if (recentDreams.length === 0) { Alert.alert('No Recent Dreams', 'Record some dreams this week to generate a report.'); return; }
    if (weeklyReport) return;
    setReportLoading(true);
    try { const report = await generateWeeklyReport(recentDreams); setWeeklyReport(report); }
    catch { Alert.alert('Error', 'Could not generate weekly report. Check your Gemini API key.'); }
    finally { setReportLoading(false); }
  }, [recentDreams, weeklyReport]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>Insights</Text>

        {/* Dream Health Score */}
        <FadeInView delay={100}>
          <View style={[styles.scoreCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.scoreRing}>
              <Svg width={100} height={100} viewBox="0 0 100 100">
                <Circle cx="50" cy="50" r="45" stroke={c.bg} strokeWidth="6" fill="none" />
                <Circle cx="50" cy="50" r="45" stroke={c.accent} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 50 50)" />
              </Svg>
              <Text style={[styles.scoreValue, { color: c.text, fontFamily: theme.fonts.heading }]}>{healthScore}</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreLabel, { color: c.text, fontFamily: theme.fonts.heading }]}>Dream Health</Text>
              <Text style={[styles.scoreDescription, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
                {totalDreams === 0 ? 'Start recording to build your score' : `Based on ${totalDreams} dream${totalDreams !== 1 ? 's' : ''} · ${recentDreams.length} this week`}
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* Mood Trends */}
        <FadeInView delay={200} style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={c.accent} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Mood Trends</Text>
          </View>
          <View style={[styles.moodChart, { backgroundColor: c.surface, borderColor: c.border }]}>
            {totalDreams === 0 ? (
              <Text style={[styles.placeholder, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Record dreams to see your mood trends over time</Text>
            ) : (
              <View style={styles.moodBars}>
                {dreams.slice(0, 7).map((dream) => {
                  const primaryMood = dream.moods[0];
                  const confidence = primaryMood?.confidence ?? 0.3;
                  const moodColor = primaryMood?.gradient[0] ?? c.accent;
                  const barHeight = 8 + confidence * 44;
                  return (
                    <Pressable key={dream.id} onPress={() => router.push(`/dream/${dream.id}`)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                      <View style={[styles.moodBar, { height: barHeight, backgroundColor: moodColor }]} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </FadeInView>

        {/* Recurring Symbols */}
        <FadeInView delay={300} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Repeat size={18} color={c.accent} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Recurring Symbols</Text>
          </View>
          {recurringSymbols.length > 0 ? (
            <View style={styles.symbolsGrid}>{recurringSymbols.map((sym: any, i: number) => <SymbolChip key={i} symbol={sym} highlighted={sym.occurrence_count > 2} />)}</View>
          ) : (
            <Text style={[styles.placeholder, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Symbols from your dreams will appear here</Text>
          )}
        </FadeInView>

        {/* Dream Connections */}
        {dreamConnections.length > 0 && (
          <FadeInView delay={350} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Link2 size={18} color={c.accent} strokeWidth={1.5} />
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Dream Connections</Text>
            </View>
            {dreamConnections.map((conn) => (
              <View key={conn.symbol} style={[styles.connectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.connectionSymbol, { color: c.text, fontFamily: theme.fonts.heading }]}>{conn.emoji} {conn.symbol}</Text>
                <View style={styles.connectionDreams}>
                  {conn.dreams.map((d) => (
                    <Pressable key={d.id} onPress={() => router.push(`/dream/${d.id}`)} style={({ pressed }) => [styles.connectionDreamPill, { backgroundColor: c.card }, pressed && { opacity: 0.7 }]}>
                      <Text style={[styles.connectionDreamText, { color: c.accent, fontFamily: theme.fonts.body }]} numberOfLines={1}>{d.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </FadeInView>
        )}

        {/* Weekly Report */}
        <FadeInView delay={400} style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color={c.accent} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Weekly Report</Text>
          </View>
          <Pressable style={[styles.reportCard, { backgroundColor: c.accentSubtle, borderColor: c.border }]} onPress={handleViewReport} disabled={reportLoading}>
            <Text style={[styles.reportTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Your Dream Week</Text>
            {reportLoading ? (
              <ActivityIndicator color={c.accent} style={{ marginVertical: spacing.sm }} />
            ) : weeklyReport ? (
              <Text style={[styles.reportBody, { color: c.text, fontFamily: theme.fonts.body }]}>{weeklyReport}</Text>
            ) : (
              <Text style={[styles.reportSubtitle, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Tap to generate an AI summary of your dream patterns</Text>
            )}
          </Pressable>
        </FadeInView>

        {/* Pattern Alerts */}
        <FadeInView delay={500} style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={18} color={c.accent} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Pattern Alerts</Text>
          </View>
          {patternAlerts.length > 0 ? (
            <View style={styles.alertsList}>{patternAlerts.map((alert) => <PatternAlertCard key={alert.id} alert={alert} />)}</View>
          ) : (
            <Text style={[styles.placeholder, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>
              {totalDreams < 3 ? 'Record at least 3 dreams to start detecting patterns' : "We'll alert you when we detect recurring patterns"}
            </Text>
          )}
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxxl },
  pageTitle: { fontSize: fs.heading, paddingTop: spacing.md, marginBottom: spacing.lg },
  scoreCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, marginBottom: spacing.lg },
  scoreRing: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { position: 'absolute', fontSize: fs.title },
  scoreInfo: { flex: 1, gap: spacing.xs },
  scoreLabel: { fontSize: fs.subhead },
  scoreDescription: { fontSize: fs.caption },
  section: { marginBottom: spacing.lg, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fs.subhead },
  moodChart: { height: 80, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, justifyContent: 'flex-end' },
  moodBars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flex: 1 },
  moodBar: { flex: 1, borderRadius: radius.sm, minHeight: 8 },
  symbolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  connectionCard: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  connectionSymbol: { fontSize: fs.caption },
  connectionDreams: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  connectionDreamPill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  connectionDreamText: { fontSize: fs.tiny, maxWidth: 140 },
  reportCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  reportTitle: { fontSize: fs.body },
  reportSubtitle: { fontSize: fs.caption },
  reportBody: { fontSize: fs.caption, lineHeight: fs.caption * 1.6 },
  alertsList: { gap: spacing.sm },
  placeholder: { fontSize: fs.caption, textAlign: 'center', paddingVertical: spacing.lg },
});
