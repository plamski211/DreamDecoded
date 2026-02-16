import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, TextInput, Animated, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import FadeInView from '@/components/FadeInView';
import CalendarStrip from '@/components/CalendarStrip';
import { isToday, isYesterday, isThisWeek, isThisMonth, isSameDay } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, SCREEN_PADDING } from '@/lib/theme';
import { useAppStore } from '@/lib/store';
import DreamCard from '@/components/DreamCard';
import GlowOrb from '@/components/GlowOrb';
import type { Dream } from '@/types';

const FILTERS = ['All', 'This Week', 'This Month', 'Recurring'] as const;
type Filter = (typeof FILTERS)[number];

type DateSection = 'Today' | 'Yesterday' | 'Earlier this week' | 'This month' | 'Older';

function getDateSection(dateStr: string): DateSection {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return 'Earlier this week';
  if (isThisMonth(date)) return 'This month';
  return 'Older';
}

const SECTION_ORDER: DateSection[] = ['Today', 'Yesterday', 'Earlier this week', 'This month', 'Older'];

function groupDreamsByDate(dreams: Dream[]): { title: DateSection; data: Dream[] }[] {
  const groups: Record<DateSection, Dream[]> = {
    'Today': [],
    'Yesterday': [],
    'Earlier this week': [],
    'This month': [],
    'Older': [],
  };
  for (const dream of dreams) {
    groups[getDateSection(dream.created_at)].push(dream);
  }
  return SECTION_ORDER
    .filter((s) => groups[s].length > 0)
    .map((s) => ({ title: s, data: groups[s] }));
}

export default function DreamsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const dreams = useAppStore((s) => s.dreams);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Animated underline
  const underlineX = useRef(new Animated.Value(0)).current;
  const underlineW = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const handleTabLayout = useCallback((filter: Filter) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[filter] = { x, width };
    if (filter === activeFilter) {
      underlineX.setValue(x);
      underlineW.setValue(width);
    }
  }, [activeFilter, underlineX, underlineW]);

  const handleTabPress = useCallback((filter: Filter) => {
    setActiveFilter(filter);
    setSelectedDate(null);
    const layout = tabLayouts.current[filter];
    if (layout) {
      Animated.parallel([
        Animated.spring(underlineX, { toValue: layout.x, useNativeDriver: false, bounciness: 0, speed: 14 }),
        Animated.spring(underlineW, { toValue: layout.width, useNativeDriver: false, bounciness: 0, speed: 14 }),
      ]).start();
    }
  }, [underlineX, underlineW]);

  const handleSearchOpen = useCallback(() => {
    setSearchActive(true);
  }, []);

  const handleSearchClose = useCallback(() => {
    setSearchActive(false);
    setSearchQuery('');
  }, []);

  // Build cross-dream symbol counts so the Recurring filter works
  const recurringSymbolNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of dreams) {
      for (const s of d.symbols) {
        const key = s.name.toLowerCase().trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const names = new Set<string>();
    for (const [name, count] of counts) {
      if (count >= 2) names.add(name);
    }
    return names;
  }, [dreams]);

  const filteredDreams = useMemo(() => {
    let result = dreams;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(q) || d.transcription.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q));
    }
    switch (activeFilter) {
      case 'This Week': result = result.filter((d) => isThisWeek(new Date(d.created_at))); break;
      case 'This Month': result = result.filter((d) => isThisMonth(new Date(d.created_at))); break;
      case 'Recurring': result = result.filter((d) => d.symbols.some((s) => recurringSymbolNames.has(s.name.toLowerCase().trim()))); break;
    }
    if (selectedDate) {
      result = result.filter((d) => isSameDay(new Date(d.created_at), selectedDate));
    }
    return result;
  }, [dreams, activeFilter, searchQuery, recurringSymbolNames, selectedDate]);

  const sections = useMemo(() => groupDreamsByDate(filteredDreams), [filteredDreams]);

  let itemIndex = 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header: title row or search bar */}
      <View style={styles.header}>
        {searchActive ? (
          <View style={styles.searchBar}>
            <Search size={18} color={c.textTertiary} strokeWidth={1.5} />
            <TextInput
              style={[styles.searchInput, { color: c.text, fontFamily: theme.fonts.body }]}
              placeholder="Search dreams..."
              placeholderTextColor={c.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <Pressable onPress={handleSearchClose} hitSlop={8}>
              <X size={18} color={c.textSecondary} strokeWidth={1.5} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>
                Your Dreams
              </Text>
              {dreams.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: c.accentMuted }]}>
                  <Text style={[styles.countText, { color: c.accent, fontFamily: theme.fonts.caption }]}>
                    {dreams.length}
                  </Text>
                </View>
              )}
            </View>
            <Pressable onPress={handleSearchOpen} hitSlop={8}>
              <Search size={22} color={c.text} strokeWidth={1.5} />
            </Pressable>
          </>
        )}
      </View>

      {/* Filter tabs with animated underline */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsRow}>
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => handleTabPress(filter)}
              onLayout={handleTabLayout(filter)}
              hitSlop={4}
            >
              <Text style={[
                styles.tabLabel,
                { fontFamily: theme.fonts.body, color: c.textTertiary },
                activeFilter === filter && { color: c.text },
              ]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>
        {/* Divider line */}
        <View style={[styles.tabDivider, { backgroundColor: c.borderSubtle }]} />
        {/* Animated underline — flow-positioned with marginLeft to match tab x */}
        <Animated.View
          style={[
            styles.tabUnderline,
            { backgroundColor: c.accent, width: underlineW, marginLeft: underlineX },
          ]}
        />
      </View>

      {/* Calendar strip */}
      <FadeInView delay={100}>
        <View style={styles.calendarWrapper}>
          <CalendarStrip dreams={dreams} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </View>
      </FadeInView>

      {/* Content */}
      {filteredDreams.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={[
              styles.sectionHeader,
              {
                color: c.textTertiary,
                fontFamily: theme.fonts.caption,
                letterSpacing: theme.labelStyle.letterSpacing,
                textTransform: theme.labelStyle.textTransform,
                fontSize: theme.labelStyle.fontSize,
                backgroundColor: c.bg,
              },
            ]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => {
            const i = itemIndex++;
            return (
              <FadeInView delay={Math.min(i * 80, 300)} style={styles.cardWrapper}>
                <DreamCard dream={item} />
              </FadeInView>
            );
          }}
          contentContainerStyle={styles.list}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <View style={styles.empty}>
          <GlowOrb size={80} breathingDuration={4000} />
          <Text style={[styles.emptyTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>
            {searchQuery ? 'No dreams found' : 'No dreams yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>
            {searchQuery ? 'Try a different search term' : 'Record your first dream to get started'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 48,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fs.heading },
  countBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: { fontSize: fs.tiny },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fs.body,
    paddingVertical: 0,
  },
  tabsContainer: {
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: spacing.sm,
  },
  calendarWrapper: {
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingBottom: spacing.sm + 2,
  },
  tabLabel: { fontSize: fs.caption, paddingVertical: 2 },
  tabDivider: { height: 1 },
  tabUnderline: {
    height: 2,
    marginTop: -2,
    borderRadius: 1,
  },
  list: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxxl },
  cardWrapper: {},
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionSeparator: { height: 0 },
  separator: { height: spacing.md + 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xxxl },
  emptyTitle: { fontSize: fs.subhead, marginTop: spacing.sm },
  emptySubtitle: { fontSize: fs.caption, textAlign: 'center' },
});
