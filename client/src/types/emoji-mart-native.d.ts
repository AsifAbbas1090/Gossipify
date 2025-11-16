declare module 'emoji-mart-native' {
  import * as React from 'react';
  export const Picker: React.ComponentType<{ onSelect: (emoji: any) => void; theme?: 'light' | 'dark' | 'auto' }>;
}


