import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, fontSize as fs, lineHeight } from '@/lib/theme';
import { success as hapticSuccess } from '@/lib/haptics';

interface StreakCelebrationProps {
  streak: number;
  onComplete: () => void;
}

const MILESTONES: Record<number, string> = {
  3: 'Three days strong',
  7: 'One week of dreams',
  14: 'Two weeks running',
  21: 'Three weeks deep',
  30: 'One month of dreaming',
  50: 'Fifty days of insight',
  100: 'One hundred dreams decoded',
};

export function isMilestone(streak: number): boolean {
  return streak in MILESTONES;
}

export default function StreakCelebration({ streak, onComplete }: StreakCelebrationProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const numberScale = useRef(new Animated.Value(0.6)).current;
  const numberOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const message = MILESTONES[streak] || `${streak} day streak`;

  useEffect(() => {
    hapticSuccess();

    Animated.sequence([
      // Fade in overlay
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Ring 1 expands
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, damping: 10, stiffness: 100, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]),
      // Ring 2 expands (staggered)
      Animated.parallel([
        Animated.spring(ring2Scale, { toValue: 1.3, damping: 10, stiffness: 80, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0.15, duration: 400, useNativeDriver: true }),
      ]),
      // Number pops
      Animated.parallel([
        Animated.spring(numberScale, { toValue: 1, damping: 8, stiffness: 200, useNativeDriver: true }),
        Animated.timing(numberOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // Text fades in
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Hold
      Animated.delay(1800),
      // Fade out everything
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(numberOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      onComplete();
    });
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      {/* Expanding rings */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: c.streak,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.ringOuter,
          {
            borderColor: c.streak,
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />

      {/* Streak number */}
      <Animated.Text
        style={[
          styles.number,
          {
            color: c.streak,
            fontFamily: theme.fonts.heading,
            opacity: numberOpacity,
            transform: [{ scale: numberScale }],
          },
        ]}
      >
        {streak}
      </Animated.Text>

      {/* Message */}
      <Animated.Text
        style={[
          styles.message,
          {
            color: c.text,
            fontFamily: theme.fonts.body,
            opacity: textOpacity,
          },
        ]}
      >
        {message}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
  },
  number: {
    fontSize: 72,
    lineHeight: 72 * 1.1,
  },
  message: {
    fontSize: fs.body,
    marginTop: spacing.md,
    lineHeight: fs.body * lineHeight.normal,
  },
});
