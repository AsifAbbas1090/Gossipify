import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { getTheme } from '../theme';

interface SecurityBannerProps {
  variant?: 'default' | 'compact';
}

export default function SecurityBanner({ variant = 'default' }: SecurityBannerProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primarySubtle,
          borderColor: theme.colors.primary,
        },
        variant === 'compact' && styles.compact,
      ]}
    >
      <Text style={[styles.icon, { color: theme.colors.primary }]}>🔒</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          End-to-end encrypted
        </Text>
        {variant !== 'compact' && (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Keys stored on device only
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  compact: {
    paddingVertical: 8,
    marginVertical: 4,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
});

