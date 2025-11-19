/**
 * WhatsApp Web Color Palette
 * Exact colors from WhatsApp Web
 */

export const colors = {
  // WhatsApp Web backgrounds
  background: {
    light: '#EFEAE2', // WhatsApp chat background
    dark: '#0B141A', // Dark mode chat background
    card: {
      light: '#FFFFFF', // White for chat list
      dark: '#202C33', // Dark mode chat list
    },
  },

  // WhatsApp Web header
  header: {
    light: '#F0F2F5', // WhatsApp header gray
    dark: '#202C33', // Dark mode header
  },

  // Primary accent - WhatsApp green
  primary: {
    light: '#25D366', // WhatsApp green
    dark: '#25D366',
    hover: '#20BA5A',
    pressed: '#1DA851',
    subtle: {
      light: '#DCF8C6', // Message sent bubble
      dark: '#005C4B', // Dark mode sent bubble
    },
  },

  // Message bubbles
  message: {
    sent: {
      light: '#DCF8C6', // Light green for sent messages
      dark: '#005C4B', // Dark green for dark mode
    },
    received: {
      light: '#FFFFFF', // White for received messages
      dark: '#202C33', // Dark gray for dark mode
    },
  },

  // Text colors
  text: {
    primary: {
      light: '#111B21', // WhatsApp dark text
      dark: '#E9EDEF', // Light text for dark mode
    },
    secondary: {
      light: '#667781', // WhatsApp gray text
      dark: '#8696A0', // Lighter gray for dark mode
    },
    tertiary: {
      light: '#8696A0', // Lighter gray
      dark: '#667781', // Darker gray for dark mode
    },
    inverse: {
      light: '#FFFFFF',
      dark: '#111B21',
    },
  },

  // Borders
  border: {
    light: '#E9EDEF', // WhatsApp border
    dark: '#313D45', // Dark mode border
    focus: {
      light: '#25D366',
      dark: '#25D366',
    },
  },

  // Status colors
  status: {
    success: '#25D366',
    warning: '#F59E0B',
    error: '#F15C6D',
    info: '#25D366',
  },

  // Encryption/security indicators
  encryption: {
    active: '#25D366',
    inactive: '#8696A0',
    shimmer: {
      light: 'rgba(37, 211, 102, 0.3)',
      dark: 'rgba(37, 211, 102, 0.2)',
    },
  },

  // Unread badge
  unread: {
    light: '#25D366',
    dark: '#25D366',
  },
};

export type ColorScheme = 'light' | 'dark';

export function getColors(scheme: ColorScheme) {
  return {
    background: colors.background[scheme],
    backgroundCard: colors.background.card[scheme],
    header: colors.header[scheme],
    primary: colors.primary[scheme],
    primaryHover: colors.primary.hover,
    primaryPressed: colors.primary.pressed,
    primarySubtle: colors.primary.subtle[scheme],
    messageSent: colors.message.sent[scheme],
    messageReceived: colors.message.received[scheme],
    textPrimary: colors.text.primary[scheme],
    textSecondary: colors.text.secondary[scheme],
    textTertiary: colors.text.tertiary[scheme],
    textInverse: colors.text.inverse[scheme],
    border: colors.border[scheme],
    borderFocus: colors.border.focus[scheme],
    status: colors.status,
    encryption: colors.encryption,
    unread: colors.unread[scheme],
  };
}
