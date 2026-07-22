/**
 * XEARN — Design Token System
 * Fintech premium dark theme
 */

export const colors = {
  // Backgrounds
  bg: '#0c1222',
  bgCard: '#162032',
  bgCardAlt: '#1c2a42',
  bgInput: '#1c2a42',
  bgOverlay: 'rgba(12, 18, 34, 0.85)',

  // Borders
  border: 'rgba(51, 65, 85, 0.4)',
  borderLight: 'rgba(51, 65, 85, 0.6)',
  borderActive: 'rgba(20, 184, 166, 0.3)',

  // Text
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textDim: '#64748b',

  // Primary (teal)
  primary: '#14b8a6',
  primaryLight: '#5eead4',
  primaryDark: '#0d9488',
  primaryGlow: 'rgba(20, 184, 166, 0.15)',
  primaryGradient: ['#0d9488', '#14b8a6', '#5eead4'] as const,

  // Secondary (gold/amber — fintech wealth feel)
  secondary: '#f59e0b',
  secondaryLight: '#fbbf24',
  secondaryDark: '#d97706',
  secondaryGlow: 'rgba(245, 158, 11, 0.15)',
  secondaryGradient: ['#d97706', '#f59e0b', '#fbbf24'] as const,

  // Semantic
  success: '#22c55e',
  successGlow: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerGlow: 'rgba(239, 68, 68, 0.15)',
  info: '#3b82f6',

  // Tier colors
  tierNormal: '#94a3b8',
  tierPremium: '#f59e0b',
  tierVip: '#a855f7',

  // Misc
  gold: '#fbbf24',
  purple: '#a855f7',
  white: '#ffffff',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  glowGold: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const gradients = {
  primary: ['#0d9488', '#14b8a6'] as const,
  primaryLight: ['#14b8a6', '#5eead4'] as const,
  secondary: ['#d97706', '#f59e0b'] as const,
  premium: ['#0d9488', '#14b8a6', '#f59e0b'] as const,
  vip: ['#7c3aed', '#a855f7'] as const,
  dark: ['#0c1222', '#162032'] as const,
  card: ['rgba(22, 32, 50, 0.8)', 'rgba(28, 42, 66, 0.4)'] as const,
};

export const zIndex = {
  base: 0,
  card: 1,
  overlay: 10,
  modal: 20,
  toast: 30,
};
