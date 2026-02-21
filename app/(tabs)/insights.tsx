import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp, Repeat, FileText, Link2, AlertCircle } from 'lucide-react-native';
import FadeInView from '@/components/FadeInView';
import Svg, { Circle } from 'react-native-svg';
import { subDays, isAfter, format } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, SCREEN_PADDING } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import SymbolChip from '@/components/SymbolChip';
import PatternAlertCard from '@/components/PatternAlert';
import type { PatternAlert, Dream, DreamSymbol } from '@/types';

// Positivity score per mood — determines bar height in the weekly chart
const MOOD_SCORE: Record<string, number> = {
  joyful: 1.0, peaceful: 0.9, excited: 0.8,
  neutral: 0.5, confused: 0.4,
  sad: 0.2, anxious: 0.15, fearful: 0.0,
};

// Fixed colors per mood (same as gradient[0] values used throughout the app)
const MOOD_COLOR: Record<string, string> = {
  peaceful: '#5B8DEF', anxious: '#EF4444', joyful: '#F59E0B',
  confused: '#8B5CF6', sad: '#3B82F6', excited: '#F472B6',
  fearful: '#6366F1', neutral: '#6B7280',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type SymbolEntry = { symbol: DreamSymbol; count: number; dreamIds: string[] };

async function generateWeeklyReport(recentDreams: Dream[]): Promise<string> {
  const dreamSummaries = recentDreams
    .map((d, i) => {
      const symbols = d.symbols.map((s) => s.name).join(', ');
      const moods = d.moods.map((m) => m.mood).join(', ');
      return `Dream ${i + 1} (${format(new Date(d.created_at), 'EEE')}): "${d.title}" — ${d.summary} [Moods: ${moods}] [Symbols: ${symbols}]`;
    })
    .join('\n');

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: { dreamSummaries, dreamCount: recentDreams.length },
  });

  if (error) {
    let detail = data?.error ?? data?.message;
    if (!detail && (error as any).context) {
      try { const body = await (error as any).context.json(); detail = body?.error ?? body?.message; } catch {}
    }
    throw new Error(detail || error.message || 'Failed to generate report');
  }
  if (data?.error) throw new Error(data.error);
  return data?.report ?? '';
}

export default function InsightsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const dreams = useAppStore((s) => s.dreams);
  const [weeklyReport, setWeeklyReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const totalDreams = dreams.length;

  const recentDreams = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    return dreams.filter((d) => isAfter(new Date(d.created_at), sevenDaysAgo));
  }, [dreams]);

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

  // Last 7 calendar days — each entry has the dominant mood for that day (or null)
  const sevenDayMoods = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayDreams = dreams.filter(
        (d) => format(new Date(d.created_at), 'yyyy-MM-dd') === dayStr,
      );
      if (dayDreams.length === 0) return { label: format(day, 'EEEEE'), mood: null };
      const allMoods = dayDreams.flatMap((d) => d.moods);
      const dominant = [...allMoods].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
      return { label: format(day, 'EEEEE'), mood: dominant };
    });
  }, [dreams]);

  // Proportion of each mood as the primary mood across all dreams
  const moodDistribution = useMemo(() => {
    const counts: Record<string, { count: number; emoji: string }> = {};
    for (const dream of dreams) {
      const primary = [...dream.moods].sort((a, b) => b.confidence - a.confidence)[0];
      if (primary) {
        if (!counts[primary.mood]) counts[primary.mood] = { count: 0, emoji: primary.emoji };
        counts[primary.mood].count += 1;
      }
    }
    const total = Object.values(counts).reduce((s, v) => s + v.count, 0) || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([mood, { count, emoji }]) => ({
        mood,
        count,
        emoji,
        pct: count / total,
        color: MOOD_COLOR[mood] ?? '#6B7280',
      }));
  }, [dreams]);

  // Compare average positivity of last 3 dreams vs the 3 before that
  const moodTrend = useMemo((): 'up' | 'down' | 'neutral' => {
    if (dreams.length < 2) return 'neutral';
    const score = (d: Dream) => {
      const primary = [...d.moods].sort((a, b) => b.confidence - a.confidence)[0];
      return primary ? (MOOD_SCORE[primary.mood] ?? 0.5) : 0.5;
    };
    const recent = dreams.slice(0, Math.min(3, dreams.length));
    const prev = dreams.slice(Math.min(3, dreams.length), Math.min(6, dreams.length));
    if (prev.length === 0) return 'neutral';
    const recentAvg = recent.reduce((s, d) => s + score(d), 0) / recent.length;
    const prevAvg = prev.reduce((s, d) => s + score(d), 0) / prev.length;
    if (recentAvg > prevAvg + 0.08) return 'up';
    if (recentAvg < prevAvg - 0.08) return 'down';
    return 'neutral';
  }, [dreams]);

  const { recurringSymbols, symbolMap } = useMemo(() => {
    const sMap = new Map<string, SymbolEntry>();
    for (const dream of dreams) {
      for (const sym of dream.symbols) {
        const key = sym.name.toLowerCase().trim();
        const existing = sMap.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.dreamIds.includes(dream.id)) existing.dreamIds.push(dream.id);
        } else {
          sMap.set(key, { symbol: { ...sym, name: key }, count: 1, dreamIds: [dream.id] });
        }
      }
    }
    const symbols: DreamSymbol[] = Array.from(sMap.values())
      .map(({ symbol, count }) => ({ ...symbol, occurrence_count: count }))
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 8);
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
    catch { Alert.alert('Error', 'Could not generate weekly report. Check your connection and try again.'); }
    finally { setReportLoading(false); }
  }, [recentDreams, weeklyReport]);

  const activeDays = sevenDayMoods.filter((d) => d.mood !== null).length;

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

        {/* Emotional Landscape */}
        <FadeInView delay={200} style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={c.accent} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Emotional Landscape</Text>
          </View>

          {totalDreams === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.placeholder, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Record dreams to see your emotional landscape</Text>
            </View>
          ) : (
            <View style={styles.landscapeContainer}>

              {/* 7-Night Bar Chart */}
              <View style={[styles.weekCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.cardMiniLabel, {
                  color: c.textTertiary,
                  fontFamily: theme.fonts.caption,
                  letterSpacing: theme.labelStyle.letterSpacing,
                  textTransform: theme.labelStyle.textTransform,
                  fontSize: theme.labelStyle.fontSize,
                }]}>
                  This Week
                </Text>
                <View style={styles.barsRow}>
                  {sevenDayMoods.map((entry, i) => {
                    const score = entry.mood ? (MOOD_SCORE[entry.mood.mood] ?? 0.5) : 0;
                    const color = entry.mood ? (MOOD_COLOR[entry.mood.mood] ?? c.accent) : c.borderSubtle;
                    const barH = entry.mood ? Math.max(Math.round(score * 56), 6) : 0;
                    return (
                      <View key={i} style={styles.barCol}>
                        <View style={styles.emojiZone}>
                          {entry.mood ? <Text style={styles.barEmoji}>{entry.mood.emoji}</Text> : null}
                        </View>
                        <View style={styles.barTrack}>
                          {entry.mood ? (
                            <View style={[styles.barFill, { height: barH, backgroundColor: color }]} />
                          ) : (
                            <View style={[styles.barEmpty, { backgroundColor: c.borderSubtle }]} />
                          )}
                        </View>
                        <Text style={[styles.barDay, { color: entry.mood ? c.textSecondary : c.textTertiary, fontFamily: theme.fonts.caption }]}>
                          {entry.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {/* Positivity scale labels */}
                <View style={styles.scaleRow}>
                  <Text style={[styles.scaleLabel, { color: c.textTertiary, fontFamily: theme.fonts.caption }]}>fearful</Text>
                  <View style={[styles.scaleLine, { backgroundColor: c.borderSubtle }]} />
                  <Text style={[styles.scaleLabel, { color: c.textTertiary, fontFamily: theme.fonts.caption }]}>joyful</Text>
                </View>
              </View>

              {/* All-Time Mood Mix */}
              {moodDistribution.length > 0 && (
                <View style={[styles.weekCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[styles.cardMiniLabel, {
                    color: c.textTertiary,
                    fontFamily: theme.fonts.caption,
                    letterSpacing: theme.labelStyle.letterSpacing,
                    textTransform: theme.labelStyle.textTransform,
                    fontSize: theme.labelStyle.fontSize,
                  }]}>
                    All-Time Mix
                  </Text>
                  {/* Stacked proportion bar */}
                  <View style={[styles.stackedBar, { backgroundColor: c.bg }]}>
                    {moodDistribution.map((m, i) => (
                      <View
                        key={m.mood}
                        style={[
                          styles.stackedSegment,
                          {
                            flex: m.pct,
                            backgroundColor: m.color,
                            borderTopLeftRadius: i === 0 ? radius.full : 0,
                            borderBottomLeftRadius: i === 0 ? radius.full : 0,
                            borderTopRightRadius: i === moodDistribution.length - 1 ? radius.full : 0,
                            borderBottomRightRadius: i === moodDistribution.length - 1 ? radius.full : 0,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  {/* Legend */}
                  <View style={styles.mixLegend}>
                    {moodDistribution.slice(0, 5).map((m) => (
                      <View key={m.mood} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                        <Text style={[styles.legendLabel, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
                          {m.emoji} {capitalize(m.mood)} {Math.round(m.pct * 100)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Insight chips */}
              <View style={styles.insightChips}>
                {moodDistribution[0] && (
                  <View style={[styles.insightChip, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={[styles.insightDot, { backgroundColor: moodDistribution[0].color }]} />
                    <Text style={[styles.insightText, { color: c.text, fontFamily: theme.fonts.body }]}>
                      {moodDistribution[0].emoji} {capitalize(moodDistribution[0].mood)} fills {Math.round(moodDistribution[0].pct * 100)}% of your dreams
                    </Text>
                  </View>
                )}
                <View style={[styles.insightChip, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[styles.insightText, { color: c.text, fontFamily: theme.fonts.body }]}>
                    {moodTrend === 'up' && '↑ Trending more positive than your last few dreams'}
                    {moodTrend === 'down' && '↓ Dreams are drifting darker — worth noticing'}
                    {moodTrend === 'neutral' && '→ Your dream mood has been steady lately'}
                  </Text>
                </View>
                {activeDays > 0 && (
                  <View style={[styles.insightChip, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[styles.insightText, { color: c.text, fontFamily: theme.fonts.body }]}>
                      🌙 {activeDays} of 7 nights recorded this week
                    </Text>
                  </View>
                )}
              </View>

            </View>
          )}
        </FadeInView>

        {/* Recurring Symbols */}
        <FadeInView delay={300} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Repeat size={18} color={c.accent} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Recurring Symbols</Text>
          </View>
          {recurringSymbols.length > 0 ? (
            <View style={styles.symbolsGrid}>{recurringSymbols.map((sym, i) => <SymbolChip key={i} symbol={sym} highlighted={sym.occurrence_count > 2} />)}</View>
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
          {weeklyReport ? (
            <View style={[styles.reportCard, { backgroundColor: c.accentSubtle, borderColor: c.border }]}>
              <Text style={[styles.reportTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Your Dream Week</Text>
              <Text style={[styles.reportBody, { color: c.text, fontFamily: theme.fonts.body }]}>{weeklyReport}</Text>
            </View>
          ) : (
            <Pressable style={[styles.reportCard, { backgroundColor: c.accentSubtle, borderColor: c.border }]} onPress={handleViewReport} disabled={reportLoading}>
              <Text style={[styles.reportTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>Your Dream Week</Text>
              {reportLoading ? (
                <ActivityIndicator color={c.accent} style={{ marginVertical: spacing.sm }} />
              ) : (
                <Text style={[styles.reportSubtitle, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Tap to generate an AI summary of your dream patterns</Text>
              )}
            </Pressable>
          )}
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

  // Health score card
  scoreCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, marginBottom: spacing.lg },
  scoreRing: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { position: 'absolute', fontSize: fs.title },
  scoreInfo: { flex: 1, gap: spacing.xs },
  scoreLabel: { fontSize: fs.subhead },
  scoreDescription: { fontSize: fs.caption },

  // Section shell
  section: { marginBottom: spacing.lg, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fs.subhead },

  // Emotional Landscape
  emptyCard: { borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  landscapeContainer: { gap: spacing.sm },

  weekCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  cardMiniLabel: {},

  // 7-night bar chart
  barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  emojiZone: { height: 20, justifyContent: 'flex-end', alignItems: 'center' },
  barEmoji: { fontSize: 12 },
  barTrack: { height: 60, width: '75%', justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '100%', borderRadius: 4 },
  barEmpty: { width: 4, height: 4, borderRadius: 2, opacity: 0.4 },
  barDay: { fontSize: fs.micro, textAlign: 'center' },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  scaleLine: { flex: 1, height: 1 },
  scaleLabel: { fontSize: fs.micro },

  // All-time mix
  stackedBar: { flexDirection: 'row', height: 10, borderRadius: radius.full, overflow: 'hidden' },
  stackedSegment: { height: '100%' },
  mixLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: fs.tiny },

  // Insight chips
  insightChips: { gap: spacing.xs },
  insightChip: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, gap: spacing.sm },
  insightDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  insightText: { flex: 1, fontSize: fs.caption },

  // Symbols
  symbolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Connections
  connectionCard: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  connectionSymbol: { fontSize: fs.caption },
  connectionDreams: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  connectionDreamPill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  connectionDreamText: { fontSize: fs.tiny, maxWidth: 140 },

  // Weekly report
  reportCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  reportTitle: { fontSize: fs.body },
  reportSubtitle: { fontSize: fs.caption },
  reportBody: { fontSize: fs.caption, lineHeight: fs.caption * 1.6 },

  // Alerts
  alertsList: { gap: spacing.sm },
  placeholder: { fontSize: fs.caption, textAlign: 'center', paddingVertical: spacing.lg },
});
