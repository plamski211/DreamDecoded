import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BookOpen, Sparkles, User } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing } from '@/lib/theme';

export default function TabLayout() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.tabBarBg,
          borderTopColor: c.borderSubtle,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 24,
          paddingTop: spacing.sm,
          elevation: 0,
        },
        tabBarActiveTintColor: c.tabActive,
        tabBarInactiveTintColor: c.tabInactive,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.caption,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <View style={styles.orbContainer}>
              <View style={[styles.orb, { backgroundColor: c.accent }]} />
              {color === c.tabActive && (
                <View style={[styles.orbGlow, { backgroundColor: c.accent }]} />
              )}
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="dreams"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <Sparkles size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  orbContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  orb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  orbGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.15,
  },
});
