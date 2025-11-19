/**
 * Gossipify Design System - Spacing & Layout
 * Consistent spacing scale and layout tokens
 */

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
  '6xl': 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const layout = {
  // Touch targets (minimum 44px for accessibility)
  touchTarget: {
    min: 44,
    comfortable: 48,
  },

  // Avatar sizes
  avatar: {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  },

  // Container padding
  container: {
    horizontal: spacing.lg,
    vertical: spacing.lg,
  },

  // Card padding
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Input heights
  input: {
    min: 44,
    comfortable: 48,
  },
};

