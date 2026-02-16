import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface GlowOrbProps {
  size?: number;
  breathing?: boolean;
  breathingDuration?: number;
  audioLevel?: Animated.Value;
}

export default function GlowOrb({
  size = 120,
  breathing = true,
  breathingDuration,
  audioLevel,
}: GlowOrbProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const orb = theme.orb;
  const duration = breathingDuration ?? orb.breatheDuration;
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    if (breathing) {
      progress.setValue(0);
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(progress, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      animRef.current.start();
    }
    return () => { animRef.current?.stop(); };
  }, [breathing, duration, theme.key]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, orb.breatheScale],
  });

  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.4],
  });

  const ringSize = size + orb.ringWidth * 2 + 4;

  return (
    <View style={[styles.container, { width: size * 1.6, height: size * 1.6 }]}>
      {/* Ambient glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            backgroundColor: c.orbGlow,
            opacity: glowOpacity,
            transform: [{ scale }],
          },
        ]}
      />
      {/* Ring */}
      <Animated.View
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: orb.ringWidth,
          borderColor: c.orbRing,
          position: 'absolute',
          transform: [{ scale }],
        }}
      />
      {/* Body */}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.orbBody,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        {/* Inner fill */}
        <View
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            backgroundColor: c.orbFill,
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
});
