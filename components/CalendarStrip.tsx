import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react-native';
import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, fontSize as fs, radius } from '@/lib/theme';
import type { Dream } from '@/types';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SWIPE_THRESHOLD = 50;

interface CalendarStripProps {
  dreams: Dream[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

export default function CalendarStrip({
  dreams,
  selectedDate,
  onSelectDate,
}: CalendarStripProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [expanded, setExpanded] = useState(false);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [viewingMonth, setViewingMonth] = useState(() => startOfMonth(new Date()));

  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  // — Week days (collapsed) —
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
    [weekStart]
  );

  // — Month grid days (expanded) —
  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(viewingMonth);
    const monthEnd = endOfMonth(viewingMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewingMonth]);

  // — Dream dates set —
  const dreamDates = useMemo(() => {
    const set = new Set<string>();
    for (const d of dreams) {
      set.add(format(new Date(d.created_at), 'yyyy-MM-dd'));
    }
    return set;
  }, [dreams]);

  // — Collapsed header label —
  const thisWeekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );
  const isCurrentWeek = isSameDay(weekStart, thisWeekStart);

  const weekLabel = useMemo(() => {
    if (isCurrentWeek) return 'This Week';
    if (isSameDay(addDays(weekStart, 7), thisWeekStart)) return 'Last Week';
    const end = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM d')} – ${format(end, 'd')}`;
  }, [weekStart, thisWeekStart, isCurrentWeek]);

  // — Is the expanded view showing the current month? —
  const isCurrentMonth = isSameMonth(viewingMonth, new Date());

  // — Navigation callbacks (all use functional setState → safe to capture) —
  const goBackWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goForwardWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  const goBackMonth = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewingMonth((prev) => addMonths(prev, -1));
  }, []);

  const goForwardMonth = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewingMonth((prev) => addMonths(prev, 1));
  }, []);

  const goBackYear = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewingMonth((prev) => addMonths(prev, -12));
  }, []);

  const goForwardYear = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewingMonth((prev) => addMonths(prev, 12));
  }, []);

  const jumpToToday = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewingMonth(startOfMonth(new Date()));
  }, []);

  // — Toggle expand/collapse —
  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      if (!prev) {
        // Expanding: sync viewingMonth to weekStart's month
        setViewingMonth(startOfMonth(weekStart));
      }
      return !prev;
    });
  }, [weekStart]);

  // — Day press handlers —
  const handleCollapsedDayPress = useCallback(
    (day: Date) => {
      if (selectedDate && isSameDay(selectedDate, day)) {
        onSelectDate(null);
      } else {
        onSelectDate(day);
      }
    },
    [selectedDate, onSelectDate]
  );

  const handleExpandedDayPress = useCallback(
    (day: Date) => {
      onSelectDate(day);
      const newWeekStart = startOfWeek(day, { weekStartsOn: 1 });
      setWeekStart(newWeekStart);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(false);
    },
    [onSelectDate]
  );

  // — PanResponder —
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 10,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          if (expandedRef.current) goBackMonth();
          else goBackWeek();
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          if (expandedRef.current) goForwardMonth();
          else goForwardWeek();
        }
      },
    })
  ).current;

  // — Split month grid into weeks (rows) —
  const monthWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < monthGridDays.length; i += 7) {
      weeks.push(monthGridDays.slice(i, i + 7));
    }
    return weeks;
  }, [monthGridDays]);

  // ── RENDER ──

  if (expanded) {
    return (
      <View
        style={[
          styles.expandedCard,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            borderRadius: radius.lg,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Month/year nav header */}
        <View style={styles.expandedHeader}>
          <Pressable onPress={goBackYear} hitSlop={8}>
            <ChevronsLeft size={16} color={c.textTertiary} strokeWidth={1.5} />
          </Pressable>
          <Pressable onPress={goBackMonth} hitSlop={8}>
            <ChevronLeft size={18} color={c.textTertiary} strokeWidth={1.5} />
          </Pressable>

          <Pressable onPress={toggleExpand} style={styles.expandedLabelBtn}>
            <Text
              style={[
                styles.expandedLabel,
                { color: c.textSecondary, fontFamily: theme.fonts.caption },
              ]}
            >
              {format(viewingMonth, 'MMMM yyyy')}
            </Text>
            <ChevronUp size={14} color={c.textTertiary} strokeWidth={1.5} />
          </Pressable>

          <Pressable onPress={goForwardMonth} hitSlop={8}>
            <ChevronRight size={18} color={c.textTertiary} strokeWidth={1.5} />
          </Pressable>
          <Pressable onPress={goForwardYear} hitSlop={8}>
            <ChevronsRight size={16} color={c.textTertiary} strokeWidth={1.5} />
          </Pressable>
        </View>

        {/* Today pill */}
        {!isCurrentMonth && (
          <View style={styles.todayPillRow}>
            <Pressable
              onPress={jumpToToday}
              style={[
                styles.todayPill,
                { backgroundColor: c.accentMuted, borderRadius: radius.full },
              ]}
            >
              <Text
                style={[
                  styles.todayPillText,
                  { color: c.accent, fontFamily: theme.fonts.caption },
                ]}
              >
                Today
              </Text>
            </Pressable>
          </View>
        )}

        {/* Day-of-week headers */}
        <View style={styles.dayHeaderRow}>
          {DAY_LETTERS.map((letter, i) => (
            <View key={i} style={styles.monthCell}>
              <Text
                style={[
                  styles.dayLetter,
                  { color: c.textTertiary, fontFamily: theme.fonts.caption },
                ]}
              >
                {letter}
              </Text>
            </View>
          ))}
        </View>

        {/* Month grid */}
        {monthWeeks.map((week, wi) => (
          <View key={wi} style={styles.dayHeaderRow}>
            {week.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, viewingMonth);
              const isSelected =
                selectedDate != null && isSameDay(selectedDate, day);
              const isTodayDate = isToday(day);
              const hasDream = inMonth && dreamDates.has(dateKey);

              return (
                <Pressable
                  key={dateKey}
                  onPress={() => handleExpandedDayPress(day)}
                  style={styles.monthCell}
                >
                  <View
                    style={[
                      styles.monthCircle,
                      isSelected && { backgroundColor: c.accent },
                      !isSelected &&
                        isTodayDate && {
                          borderWidth: 1.5,
                          borderColor: c.accent,
                        },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthDateNum,
                        { fontFamily: theme.fonts.body },
                        isSelected
                          ? { color: c.bg }
                          : inMonth
                          ? { color: c.text }
                          : { color: c.textTertiary, opacity: 0.3 },
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.dot,
                      hasDream
                        ? { backgroundColor: c.accent }
                        : { backgroundColor: 'transparent' },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  // ── COLLAPSED (week strip) ──

  return (
    <View style={styles.container}>
      {/* Header: < label ▼ > */}
      <View style={styles.header}>
        <Pressable onPress={goBackWeek} hitSlop={8}>
          <ChevronLeft size={18} color={c.textTertiary} strokeWidth={1.5} />
        </Pressable>

        <Pressable onPress={toggleExpand} style={styles.labelBtn}>
          <Text
            style={[
              styles.weekLabel,
              { color: c.textSecondary, fontFamily: theme.fonts.caption },
            ]}
          >
            {weekLabel}
          </Text>
          <ChevronDown size={14} color={c.textTertiary} strokeWidth={1.5} />
        </Pressable>

        <Pressable onPress={goForwardWeek} hitSlop={8}>
          <ChevronRight size={18} color={c.textTertiary} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* Day row */}
      <View style={styles.row} {...panResponder.panHandlers}>
        {weekDays.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isSelected =
            selectedDate != null && isSameDay(selectedDate, day);
          const isTodayDate = isToday(day);
          const hasDream = dreamDates.has(dateKey);

          return (
            <Pressable
              key={dateKey}
              onPress={() => handleCollapsedDayPress(day)}
              style={styles.cell}
            >
              <Text
                style={[
                  styles.dayLetter,
                  { color: c.textTertiary, fontFamily: theme.fonts.caption },
                ]}
              >
                {DAY_LETTERS[i]}
              </Text>
              <View
                style={[
                  styles.circle,
                  isSelected && { backgroundColor: c.accent },
                  !isSelected &&
                    isTodayDate && { borderWidth: 1.5, borderColor: c.accent },
                ]}
              >
                <Text
                  style={[
                    styles.dateNum,
                    { fontFamily: theme.fonts.body },
                    isSelected ? { color: c.bg } : { color: c.text },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
              <View
                style={[
                  styles.dot,
                  hasDream
                    ? { backgroundColor: c.accent }
                    : { backgroundColor: 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Collapsed ──
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  labelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: fs.tiny,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNum: {
    fontSize: fs.caption,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // ── Expanded ──
  expandedCard: {
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  expandedLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 140,
    justifyContent: 'center',
  },
  expandedLabel: {
    fontSize: fs.tiny,
    textAlign: 'center',
  },
  todayPillRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  todayPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  todayPillText: {
    fontSize: fs.micro,
  },
  dayHeaderRow: {
    flexDirection: 'row',
  },
  monthCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  monthCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDateNum: {
    fontSize: fs.tiny,
  },
  dayLetter: {
    fontSize: fs.micro,
  },
});
