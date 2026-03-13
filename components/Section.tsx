import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, fontSize as fs } from '@/lib/theme';
import FadeInView from './FadeInView';

interface SectionProps {
  icon?: React.ReactNode;
  title: string;
  delay?: number;
  children: React.ReactNode;
  style?: any;
}

export default function Section({ icon, title, delay = 0, children, style }: SectionProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <FadeInView delay={delay} style={[styles.section, style]}>
      <View style={styles.header}>
        {icon}
        <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>{title}</Text>
      </View>
      {children}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fs.subhead,
  },
});
