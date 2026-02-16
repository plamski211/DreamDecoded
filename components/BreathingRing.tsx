import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface BreathingRingProps {
  size?: number;
  ringCount?: number;
  color?: string;
}

export default function BreathingRing({
  size = 240,
  ringCount = 3,
  color,
}: BreathingRingProps) {
  const { theme } = useTheme();
  const ringColor = color ?? theme.colors.orbRing;
  const duration = theme.orb.breatheDuration;
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    progress.setValue(0);
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animRef.current.start();
    return () => { animRef.current?.stop(); };
  }, [duration, theme.key]);

  const rings = Array.from({ length: ringCount }, (_, i) => i);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {rings.map((i) => (
        <AnimatedRing
          key={i}
          index={i}
          size={size}
          color={ringColor}
          progress={progress}
        />
      ))}
    </View>
  );
}

function AnimatedRing({
  index,
  size,
  color,
  progress,
}: {
  index: number;
  size: number;
  color: string;
  progress: Animated.Value;
}) {
  const ringSize = size - index * 24;
  const baseOpacity = 0.15 - index * 0.04;

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1 - index * 0.02, 1.05 + index * 0.02],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [baseOpacity, baseOpacity + 0.1, baseOpacity],
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: color,
          borderWidth: 1,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
  },
});
