import { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, Easing } from 'react-native';

type AnimationVariant = 'slide' | 'scale' | 'fade' | 'bloom';

interface FadeInViewProps {
  delay?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: AnimationVariant;
  duration?: number;
}

export default function FadeInView({
  delay = 0,
  children,
  style,
  variant = 'slide',
  duration = 450,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(variant === 'slide' ? 16 : 0)).current;
  const scale = useRef(new Animated.Value(variant === 'scale' || variant === 'bloom' ? 0.92 : 1)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animations: Animated.CompositeAnimation[] = [
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ];

      if (variant === 'slide') {
        animations.push(
          Animated.timing(translateY, {
            toValue: 0,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        );
      } else if (variant === 'scale' || variant === 'bloom') {
        animations.push(
          Animated.spring(scale, {
            toValue: 1,
            damping: variant === 'bloom' ? 10 : 15,
            stiffness: 150,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const transform: any[] = [];
  if (variant === 'slide') transform.push({ translateY });
  if (variant === 'scale' || variant === 'bloom') transform.push({ scale });

  return (
    <Animated.View style={[{ opacity, transform }, style]}>
      {children}
    </Animated.View>
  );
}
