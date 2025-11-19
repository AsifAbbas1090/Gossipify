/**
 * ConversationListItem - WhatsApp Web Style
 * Exact WhatsApp chat list item styling
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { getTheme } from '../theme';

export interface ConversationListItemProps {
  peerUsername: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount?: number;
  isEncrypted?: boolean;
  onPress: () => void;
  avatarColor?: string;
  isSelected?: boolean;
}

export default function ConversationListItem({
  peerUsername,
  lastMessage,
  timestamp,
  unreadCount = 0,
  isEncrypted = true,
  onPress,
  avatarColor,
  isSelected = false,
}: ConversationListItemProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 15 });
    translateX.value = withSpring(0, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const formatTimestamp = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name: string) => {
    return name[0]?.toUpperCase() || '?';
  };

  const getAvatarColor = () => {
    if (avatarColor) return avatarColor;
    return '#DFE5E7';
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            backgroundColor: isSelected ? theme.colors.header : theme.colors.backgroundCard,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
          <Text style={styles.avatarText}>{getInitials(peerUsername)}</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.unread }]}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[
                styles.username,
                {
                  color: theme.colors.textPrimary,
                  fontWeight: unreadCount > 0 ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {peerUsername}
            </Text>
            {timestamp && (
              <Text
                style={[
                  styles.timestamp,
                  {
                    color: unreadCount > 0 ? theme.colors.unread : theme.colors.textSecondary,
                    fontWeight: unreadCount > 0 ? '500' : '400',
                  },
                ]}
              >
                {formatTimestamp(timestamp)}
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text
              style={[
                styles.lastMessage,
                {
                  color: unreadCount > 0 ? theme.colors.textPrimary : theme.colors.textSecondary,
                  fontWeight: unreadCount > 0 ? '500' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {lastMessage || 'No messages yet'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 72,
  },
  avatar: {
    width: 49,
    height: 49,
    borderRadius: 24.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    color: '#54656F',
    fontSize: 20,
    fontWeight: '600',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
});
