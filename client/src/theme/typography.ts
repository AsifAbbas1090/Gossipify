/**
 * Gossipify Design System - Typography
 * Inter typeface with consistent scale
 */

export const typography = {
  fontFamily: {
    regular: 'Inter',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 40,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

export const textStyles = {
  // Display
  display: {
    fontSize: typography.fontSize['5xl'],
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.lineHeight.tight,
    fontWeight: typography.fontWeight.extraBold,
  },

  // Headings
  h1: {
    fontSize: typography.fontSize['4xl'],
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.lineHeight.tight,
    fontWeight: typography.fontWeight.bold,
  },
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.lineHeight.tight,
    fontWeight: typography.fontWeight.bold,
  },
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.semiBold,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.semiBold,
  },
  h4: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semiBold,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Body
  body: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.regular,
  },
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.relaxed,
    fontWeight: typography.fontWeight.regular,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.regular,
  },

  // UI
  button: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.semiBold,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.regular,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.medium,
  },
  overline: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

