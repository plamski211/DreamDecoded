import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { radius, spacing, elevation } from '@/lib/theme';

type CardVariant = 'default' | 'elevated' | 'accent' | 'interactive';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  accentColor?: string;
  style?: any;
  noPadding?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  onPress,
  accentColor,
  style,
  noPadding = false,
}: CardProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const cardStyle = [
    styles.base,
    !noPadding && styles.padded,
    variant === 'default' && { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
    variant === 'elevated' && [{ backgroundColor: c.card }, elevation.md],
    variant === 'accent' && { backgroundColor: c.accentSubtle, overflow: 'hidden' as const, flexDirection: 'row' as const },
    variant === 'interactive' && { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 },
    style,
  ];

  if (onPress || variant === 'interactive') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        ]}
      >
        {variant === 'accent' && accentColor && (
          <View style={[styles.accentBorder, { backgroundColor: accentColor || c.accent }]} />
        )}
        <View style={variant === 'accent' ? styles.accentContent : styles.childWrapper}>
          {children}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>
      {variant === 'accent' && (
        <View style={[styles.accentBorder, { backgroundColor: accentColor || c.accent }]} />
      )}
      <View style={variant === 'accent' ? styles.accentContent : styles.childWrapper}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },
  padded: {
    padding: spacing.lg,
  },
  accentBorder: {
    width: 3,
  },
  accentContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  childWrapper: {
    flex: 1,
  },
});
