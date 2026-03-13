import { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
import { getMoodGradient } from '@/lib/dreamAnalysis';
import { success as hapticSuccess } from '@/lib/haptics';
import type { Dream } from '@/types';

interface DreamRevealProps {
  dream: Dream;
  onDismiss: () => void;
}

export default function DreamReveal({ dream, onDismiss }: DreamRevealProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const emojiScale = useRef(new Animated.Value(0.3)).current;
  const emojiOpacity = useRef(new Animated.Value(0)).current;
  const symbolsOpacity = useRef(new Animated.Value(0)).current;
  const symbolsTranslateY = useRef(new Animated.Value(12)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(16)).current;
  const moodGlowOpacity = useRef(new Animated.Value(0)).current;

  const primaryMood = dream.moods[0];
  const moodColor = primaryMood ? getMoodGradient(primaryMood.mood)[0] : c.accent;
  const topSymbols = dream.symbols.slice(0, 3);

  useEffect(() => {
    hapticSuccess();

    Animated.sequence([
      // Overlay fades in
      Animated.timing(overlayOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Mood glow
      Animated.timing(moodGlowOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      // Emoji pops in
      Animated.parallel([
        Animated.spring(emojiScale, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }),
        Animated.timing(emojiOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // Slight pause
      Animated.delay(200),
      // Title types in
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      // Symbols float up
      Animated.parallel([
        Animated.timing(symbolsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(symbolsTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      // Button appears
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(buttonTranslateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      onDismiss();
    });
  }, [onDismiss]);

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: c.bg, opacity: overlayOpacity }]}>
      {/* Mood color glow at top */}
      <Animated.View
        style={[
          styles.moodGlow,
          {
            backgroundColor: moodColor,
            opacity: Animated.multiply(moodGlowOpacity, new Animated.Value(0.08)),
          },
        ]}
      />

      <View style={styles.content}>
        {/* Mood emoji - large center */}
        {primaryMood && (
          <Animated.Text
            style={[
              styles.emoji,
              {
                opacity: emojiOpacity,
                transform: [{ scale: emojiScale }],
              },
            ]}
          >
            {primaryMood.emoji}
          </Animated.Text>
        )}

        {/* Dream title */}
        <Animated.Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: theme.fonts.heading,
              letterSpacing: theme.headingStyle.letterSpacing,
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          {dream.title}
        </Animated.Text>

        {/* Mood label */}
        {primaryMood && (
          <Animated.Text
            style={[
              styles.moodLabel,
              {
                color: moodColor,
                fontFamily: theme.fonts.body,
                opacity: titleOpacity,
              },
            ]}
          >
            Feeling {primaryMood.mood}
          </Animated.Text>
        )}

        {/* Key symbols */}
        {topSymbols.length > 0 && (
          <Animated.View
            style={[
              styles.symbols,
              {
                opacity: symbolsOpacity,
                transform: [{ translateY: symbolsTranslateY }],
              },
            ]}
          >
            {topSymbols.map((sym, i) => (
              <View key={i} style={[styles.symbolPill, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={styles.symbolEmoji}>{sym.emoji}</Text>
                <Text style={[styles.symbolName, { color: c.textSecondary, fontFamily: theme.fonts.caption }]}>{sym.name}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      {/* View dream button */}
      <Animated.View
        style={[
          styles.buttonArea,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          },
        ]}
      >
        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: c.accent },
            pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text style={[styles.buttonText, { color: c.bg, fontFamily: theme.fonts.heading }]}>
            View Your Dream
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
  },
  moodGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING + spacing.md,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fs.title,
    textAlign: 'center',
    lineHeight: fs.title * lineHeight.tight,
  },
  moodLabel: {
    fontSize: fs.body,
    marginTop: spacing.xs,
  },
  symbols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  symbolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  symbolEmoji: {
    fontSize: 16,
  },
  symbolName: {
    fontSize: fs.caption,
  },
  buttonArea: {
    position: 'absolute',
    bottom: 60,
    left: SCREEN_PADDING,
    right: SCREEN_PADDING,
  },
  button: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fs.body,
  },
});
