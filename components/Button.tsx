import { Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { radius, fontSize as fs, spacing, opacity as op } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  compact = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const isDisabled = disabled || loading;

  const bgColor = {
    primary: c.accent,
    secondary: 'transparent',
    ghost: 'transparent',
    destructive: 'transparent',
  }[variant];

  const textColor = {
    primary: c.bg,
    secondary: c.text,
    ghost: c.accent,
    destructive: c.error,
  }[variant];

  const borderColor = {
    primary: 'transparent',
    secondary: c.border,
    ghost: 'transparent',
    destructive: c.error,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'secondary' || variant === 'destructive' ? 1 : 0,
        },
        pressed && { opacity: op.pressed, transform: [{ scale: 0.985 }] },
        isDisabled && { opacity: op.disabled },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, compact && styles.textCompact, { color: textColor, fontFamily: theme.fonts.heading }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compact: {
    height: 44,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: fs.body,
  },
  textCompact: {
    fontSize: fs.caption,
  },
});
