// ============================================================
// DREAMDECODE THEME SYSTEM
// ============================================================
// Every color, font, radius, and spacing value in the app
// MUST come from this theme. Never hardcode colors anywhere.
// ============================================================

export type ThemeKey = 'void' | 'ink' | 'dusk' | 'frost';

export interface ThemeColors {
  bg:            string;
  surface:       string;
  card:          string;
  cardHover:     string;

  text:          string;
  textSecondary: string;
  textTertiary:  string;

  accent:        string;
  accentMuted:   string;
  accentSubtle:  string;

  border:        string;
  borderSubtle:  string;

  orbGlow:       string;
  orbRing:       string;
  orbFill:       string;
  orbBody:       string;
  orbAmbient:    string;

  tabBarBg:      string;
  tabActive:     string;
  tabInactive:   string;

  moodPrimary:   string;
  moodSecondary: string;

  success:       string;
  warning:       string;
  error:         string;

  overlay:       string;
  glass:         string;

  premium:       string;
  streak:        string;
}

export interface ThemeFonts {
  heading: string;
  body:    string;
  caption: string;
  mono:    string;
}

export interface ThemeConfig {
  key:         ThemeKey;
  name:        string;
  description: string;
  isDark:      boolean;
  colors:      ThemeColors;
  fonts:       ThemeFonts;

  orb: {
    breatheScale:    number;
    breatheDuration: number;
    glowRadius:      number;
    ringWidth:       number;
  };

  headingStyle: {
    letterSpacing: number;
  };

  labelStyle: {
    letterSpacing: number;
    textTransform: 'uppercase' | 'none';
    fontSize:      number;
  };
}

// ============================================================
// THEME DEFINITIONS
// ============================================================

export const themes: Record<ThemeKey, ThemeConfig> = {

  // ── VOID — Light in absolute darkness ───────────────────
  void: {
    key: 'void',
    name: 'Void',
    description: 'Light in absolute darkness',
    isDark: true,
    colors: {
      bg:            '#000000',
      surface:       '#0A0A0A',
      card:          '#0F0F0F',
      cardHover:     '#141414',

      text:          '#FFFFFF',
      textSecondary: 'rgba(255,255,255,0.50)',
      textTertiary:  'rgba(255,255,255,0.25)',

      accent:        '#FFFFFF',
      accentMuted:   'rgba(255,255,255,0.12)',
      accentSubtle:  'rgba(255,255,255,0.06)',

      border:        'rgba(255,255,255,0.06)',
      borderSubtle:  'rgba(255,255,255,0.03)',

      orbGlow:       'rgba(255,255,255,0.06)',
      orbRing:       'rgba(255,255,255,0.12)',
      orbFill:       'rgba(255,255,255,0.15)',
      orbBody:       'rgba(255,255,255,0.08)',
      orbAmbient:    'rgba(255,255,255,0.03)',

      tabBarBg:      'rgba(0,0,0,0.90)',
      tabActive:     '#FFFFFF',
      tabInactive:   'rgba(255,255,255,0.20)',

      moodPrimary:   'rgba(255,255,255,0.70)',
      moodSecondary: 'rgba(255,255,255,0.40)',

      success:       '#FFFFFF',
      warning:       '#FFFFFF',
      error:         '#FFFFFF',

      overlay:       'rgba(0,0,0,0.85)',
      glass:         'rgba(15,15,15,0.70)',

      premium:       'rgba(255,255,255,0.80)',
      streak:        '#FFFFFF',
    },
    fonts: {
      heading: 'DMSans-Medium',
      body:    'DMSans-Regular',
      caption: 'DMSans-Regular',
      mono:    'SpaceMono-Regular',
    },
    orb: {
      breatheScale:    1.04,
      breatheDuration: 5000,
      glowRadius:      40,
      ringWidth:       1.5,
    },
    headingStyle: {
      letterSpacing: -0.5,
    },
    labelStyle: {
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontSize:      10,
    },
  },

  // ── INK — Handwritten in darkness ───────────────────────
  ink: {
    key: 'ink',
    name: 'Ink',
    description: 'Handwritten in darkness',
    isDark: false,
    colors: {
      bg:            '#F5F0E8',
      surface:       '#EDE8DD',
      card:          '#FFFFFF',
      cardHover:     '#FAF8F4',

      text:          '#1A1A1A',
      textSecondary: 'rgba(0,0,0,0.50)',
      textTertiary:  'rgba(0,0,0,0.30)',

      accent:        '#1A1A1A',
      accentMuted:   'rgba(0,0,0,0.08)',
      accentSubtle:  'rgba(0,0,0,0.04)',

      border:        'rgba(0,0,0,0.08)',
      borderSubtle:  'rgba(0,0,0,0.04)',

      orbGlow:       'rgba(0,0,0,0.04)',
      orbRing:       'rgba(0,0,0,0.12)',
      orbFill:       'rgba(0,0,0,0.08)',
      orbBody:       'rgba(0,0,0,0.05)',
      orbAmbient:    'rgba(0,0,0,0.02)',

      tabBarBg:      'rgba(245,240,232,0.95)',
      tabActive:     '#1A1A1A',
      tabInactive:   'rgba(0,0,0,0.25)',

      moodPrimary:   'rgba(0,0,0,0.60)',
      moodSecondary: 'rgba(0,0,0,0.35)',

      success:       '#2D5A27',
      warning:       '#8B6914',
      error:         '#8B2020',

      overlay:       'rgba(245,240,232,0.90)',
      glass:         'rgba(255,255,255,0.80)',

      premium:       '#1A1A1A',
      streak:        '#8B6914',
    },
    fonts: {
      heading: 'EBGaramond-Italic',
      body:    'EBGaramond-Regular',
      caption: 'DMSans-Regular',
      mono:    'SpaceMono-Regular',
    },
    orb: {
      breatheScale:    1.03,
      breatheDuration: 6000,
      glowRadius:      30,
      ringWidth:       1,
    },
    headingStyle: {
      letterSpacing: 0,
    },
    labelStyle: {
      letterSpacing: 0.5,
      textTransform: 'none',
      fontSize:      11,
    },
  },

  // ── DUSK — The color of twilight ────────────────────────
  dusk: {
    key: 'dusk',
    name: 'Dusk',
    description: 'The color of twilight',
    isDark: true,
    colors: {
      bg:            '#1C1B18',
      surface:       '#23221E',
      card:          '#2A2925',
      cardHover:     '#32312C',

      text:          '#E8E2D6',
      textSecondary: 'rgba(232,226,214,0.55)',
      textTertiary:  'rgba(232,226,214,0.30)',

      accent:        '#8B9A77',
      accentMuted:   'rgba(139,154,119,0.15)',
      accentSubtle:  'rgba(139,154,119,0.08)',

      border:        'rgba(167,159,137,0.10)',
      borderSubtle:  'rgba(167,159,137,0.05)',

      orbGlow:       'rgba(139,154,119,0.08)',
      orbRing:       'rgba(139,154,119,0.20)',
      orbFill:       'rgba(139,154,119,0.14)',
      orbBody:       'rgba(139,154,119,0.08)',
      orbAmbient:    'rgba(139,154,119,0.03)',

      tabBarBg:      'rgba(28,27,24,0.95)',
      tabActive:     '#8B9A77',
      tabInactive:   'rgba(232,226,214,0.25)',

      moodPrimary:   '#8B9A77',
      moodSecondary: '#A79F89',

      success:       '#8B9A77',
      warning:       '#C4A35A',
      error:         '#C47A6A',

      overlay:       'rgba(28,27,24,0.90)',
      glass:         'rgba(42,41,37,0.75)',

      premium:       '#8B9A77',
      streak:        '#C4A35A',
    },
    fonts: {
      heading: 'DMSans-Medium',
      body:    'DMSans-Regular',
      caption: 'DMSans-Regular',
      mono:    'SpaceMono-Regular',
    },
    orb: {
      breatheScale:    1.04,
      breatheDuration: 5000,
      glowRadius:      35,
      ringWidth:       1.5,
    },
    headingStyle: {
      letterSpacing: -0.3,
    },
    labelStyle: {
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      fontSize:      10,
    },
  },

  // ── FROST — Morning fog between worlds ──────────────────
  frost: {
    key: 'frost',
    name: 'Frost',
    description: 'Morning fog between worlds',
    isDark: false,
    colors: {
      bg:            '#F8F9FC',
      surface:       '#F0F2F7',
      card:          '#FFFFFF',
      cardHover:     '#F5F6FA',

      text:          '#1A1D2E',
      textSecondary: 'rgba(26,29,46,0.45)',
      textTertiary:  'rgba(26,29,46,0.25)',

      accent:        '#6B7394',
      accentMuted:   'rgba(107,115,148,0.12)',
      accentSubtle:  'rgba(107,115,148,0.06)',

      border:        'rgba(0,0,0,0.05)',
      borderSubtle:  'rgba(0,0,0,0.03)',

      orbGlow:       'rgba(107,115,148,0.06)',
      orbRing:       'rgba(107,115,148,0.14)',
      orbFill:       'rgba(107,115,148,0.12)',
      orbBody:       'rgba(107,115,148,0.07)',
      orbAmbient:    'rgba(107,115,148,0.03)',

      tabBarBg:      'rgba(248,249,252,0.95)',
      tabActive:     '#6B7394',
      tabInactive:   'rgba(26,29,46,0.20)',

      moodPrimary:   '#6B7394',
      moodSecondary: '#9BA3BE',

      success:       '#5A8A6B',
      warning:       '#9A8A4A',
      error:         '#9A5A5A',

      overlay:       'rgba(248,249,252,0.90)',
      glass:         'rgba(255,255,255,0.80)',

      premium:       '#6B7394',
      streak:        '#9A8A4A',
    },
    fonts: {
      heading: 'DMSans-Medium',
      body:    'DMSans-Regular',
      caption: 'DMSans-Regular',
      mono:    'SpaceMono-Regular',
    },
    orb: {
      breatheScale:    1.03,
      breatheDuration: 5500,
      glowRadius:      30,
      ringWidth:       1,
    },
    headingStyle: {
      letterSpacing: -0.3,
    },
    labelStyle: {
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      fontSize:      10,
    },
  },
};

// ============================================================
// SHARED CONSTANTS (same across all themes)
// ============================================================

export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const fontSize = {
  hero:    40,
  title:   28,
  heading: 22,
  subhead: 18,
  body:    16,
  caption: 14,
  tiny:    12,
  micro:   10,
} as const;

export const lineHeight = {
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.7,
} as const;

export const SCREEN_PADDING = 20;
