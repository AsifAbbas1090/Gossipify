/**
 * Gossipify Design System
 * Central theme export
 */

import { getColors, ColorScheme } from './colors';
import { typography, textStyles } from './typography';
import { spacing, borderRadius, layout } from './spacing';

export { getColors, colors } from './colors';
export { typography, textStyles } from './typography';
export { spacing, borderRadius, layout } from './spacing';

export type { ColorScheme } from './colors';

export function getTheme(scheme: ColorScheme) {
  return {
    colors: getColors(scheme),
    typography,
    textStyles,
    spacing,
    borderRadius,
    layout,
    isDark: scheme === 'dark',
  };
}

export type Theme = ReturnType<typeof getTheme>;

