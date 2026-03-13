import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface GlowOrbProps {
  size?: number;
  breathing?: boolean;
  breathingDuration?: number;
  audioLevel?: Animated.Value;
  tintColor?: string;
}

export default function GlowOrb({
  size = 120,
  breathing = true,
  breathingDuration,
  audioLevel,
  tintColor,
}: GlowOrbProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const orb = theme.orb;
  const duration = breathingDuration ?? orb.breatheDuration;
  const progress = useRef(new Animated.Value(0)).current;
  const innerProgress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const innerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    innerAnimRef.current?.stop();
    if (breathing) {
      progress.setValue(0);
      innerProgress.setValue(0);

      // Primary breathing cycle
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(progress, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );

      // Secondary inner glow — slower, offset rhythm for organic feel
      const innerDuration = duration * 1.4;
      innerAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(innerProgress, { toValue: 1, duration: innerDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(innerProgress, { toValue: 0, duration: innerDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );

      animRef.current.start();
      innerAnimRef.current.start();
    }
    return () => {
      animRef.current?.stop();
      innerAnimRef.current?.stop();
    };
  }, [breathing, duration, theme.key]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, orb.breatheScale],
  });

  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });

  const innerGlowOpacity = innerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  const innerScale = innerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 0.75],
  });

  const ringSize = size + orb.ringWidth * 2 + 4;

  return (
    <View style={[styles.container, { width: size * 1.6, height: size * 1.6 }]}>
      {/* Ambient glow — outer */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            backgroundColor: tintColor || c.orbGlow,
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
        {/* Inner fill — secondary breathing rhythm */}
        <Animated.View
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            backgroundColor: c.orbFill,
            transform: [{ scale: innerScale }],
            opacity: Animated.add(new Animated.Value(0.7), innerGlowOpacity),
          }}
        />
      </Animated.View>

      {/* Contextual mood tint glow */}
      {tintColor && (
        <Animated.View
          style={[
            styles.tintGlow,
            {
              width: size * 1.2,
              height: size * 1.2,
              borderRadius: size * 0.6,
              backgroundColor: tintColor,
              opacity: innerGlowOpacity,
            },
          ]}
        />
      )}
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
  tintGlow: {
    position: 'absolute',
  },
});
