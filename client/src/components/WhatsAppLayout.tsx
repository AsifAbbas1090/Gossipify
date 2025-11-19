/**
 * WhatsApp Web Layout Component
 * Shows chat list (30%) and chat view (70%) side by side on web/tablet
 * Full screen on mobile with navigation
 */

import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, Text } from 'react-native';
import { useColorScheme } from 'react-native';
import { getTheme } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';

export default function WhatsAppLayout() {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const { width } = useWindowDimensions();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  
  // On mobile (< 768px), show one screen at a time
  // On tablet/web (>= 768px), show both side by side
  const isMobile = width < 768;
  const showChatList = !selectedChat || !isMobile;
  const showChatView = selectedChat !== null;

  const handleSelectChat = (peerUsername: string) => {
    setSelectedChat(peerUsername);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {showChatList && (
        <View style={[
          styles.chatListContainer, 
          isMobile && selectedChat && styles.hidden,
          { backgroundColor: theme.colors.backgroundCard, borderRightColor: theme.colors.border }
        ]}>
          <HomeScreen onSelectChat={handleSelectChat} selectedChat={selectedChat} />
        </View>
      )}
      {showChatView && (
        <View style={[
          styles.chatViewContainer, 
          isMobile && !selectedChat && styles.hidden,
          { backgroundColor: theme.colors.background }
        ]}>
          {selectedChat ? (
            <ChatScreen 
              peerUsername={selectedChat} 
              onBack={isMobile ? handleBack : undefined}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyContent}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>💬</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>
                  Keep your phone connected
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  WhatsApp connects to your phone to sync messages. To reduce data usage, connect your phone to Wi-Fi.
                </Text>
                <View style={[styles.emptyFooter, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.emptyFooterText, { color: theme.colors.textTertiary }]}>
                    Your messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  chatListContainer: {
    width: '30%',
    minWidth: 310,
    maxWidth: 420,
    borderRightWidth: 1,
  },
  chatViewContainer: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyContent: {
    maxWidth: 400,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(102, 119, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 80,
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: '300',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyFooter: {
    paddingTop: 24,
    borderTopWidth: 1,
    width: '100%',
  },
  emptyFooterText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
