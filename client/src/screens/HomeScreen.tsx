/**
 * HomeScreen - WhatsApp Web Chat List Style
 * Shows list of conversations with unread indicators
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  useColorScheme,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getUsername } from '../lib/storage';
import { getTheme } from '../theme';
import { ConversationListItem, SecurityBanner } from '../components';
import { poll } from '../lib/api';

interface HomeScreenProps {
  onSelectChat?: (peerUsername: string) => void;
  selectedChat?: string | null;
}

export default function HomeScreen({ onSelectChat, selectedChat }: HomeScreenProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const navigation = useNavigation();
  const [peer, setPeer] = useState('');
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [me, setMe] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readTimestamps, setReadTimestamps] = useState<Map<string, number>>(new Map());

  type Conversation = {
    id: string;
    peer: string;
    lastMessage?: string;
    timestamp?: number;
    unread: number;
  };

  useEffect(() => {
    (async () => {
      const u = await getUsername();
      if (u) setMe(u);
    })();
  }, []);

  // Clear unread count when chat is selected
  useEffect(() => {
    if (selectedChat) {
      setReadTimestamps((prev) => {
        const updated = new Map(prev);
        updated.set(selectedChat, Date.now());
        return updated;
      });
    }
  }, [selectedChat]);

  // Poll for conversations
  useEffect(() => {
    if (!me) return;
    let mounted = true;
    const pollMessages = async () => {
      try {
        const result = await poll(me, 0);
        if (!mounted) return;
        const peerMap = new Map<string, Conversation>();
        if (result.messages && Array.isArray(result.messages)) {
          for (const msg of result.messages) {
            const msgFrom = String(msg.from || '').trim().toLowerCase();
            const msgTo = String(msg.to || '').trim().toLowerCase();
            const myUsername = String(me || '').trim().toLowerCase();
            
            // Message must involve current user
            if (msgFrom !== myUsername && msgTo !== myUsername) continue;
            
            // Determine peer name - the OTHER person in the conversation
            const peerName = msgFrom === myUsername ? msgTo : msgFrom;
            if (!peerName || peerName === '') continue;
            
            // Safety check: peer name should not be the same as my username
            if (peerName === myUsername) continue;
            
            // Get last read timestamp for this peer
            const lastRead = readTimestamps.get(peerName) || 0;
            const msgTimestamp = msg.timestamp || 0;
            const isUnread = msgTo === myUsername && msgTimestamp > lastRead;
            
            if (!peerMap.has(peerName)) {
              peerMap.set(peerName, {
                id: peerName,
                peer: peerName,
                lastMessage: msg.ciphertext || msg.attachmentId ? '🔒 Encrypted message' : 'New message',
                timestamp: msgTimestamp,
                unread: isUnread ? 1 : 0,
              });
            } else {
              const existing = peerMap.get(peerName)!;
              if (msgTimestamp && (!existing.timestamp || msgTimestamp > existing.timestamp)) {
                existing.lastMessage = msg.ciphertext || msg.attachmentId ? '🔒 Encrypted message' : 'New message';
                existing.timestamp = msgTimestamp;
              }
              if (isUnread) {
                existing.unread = (existing.unread || 0) + 1;
              }
            }
          }
        }
        const sortedConvos = Array.from(peerMap.values()).sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeB - timeA;
        });
        setConvos(sortedConvos);
      } catch (e) {
        // Silent fail for polling
      }
    };
    pollMessages();
    const interval = setInterval(pollMessages, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [me, readTimestamps]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const startChat = () => {
    if (!peer.trim()) {
      Alert.alert('Username required', 'Please enter a username to start a chat');
      return;
    }
    if (onSelectChat) {
      onSelectChat(peer.trim().toLowerCase()); // Normalize to lowercase
    }
    setPeer('');
  };

  const filteredConvos = convos.filter(convo =>
    convo.peer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundCard }]}>
      {/* WhatsApp Web Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
        <View style={styles.headerContent}>
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.backgroundCard }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search or start new chat"
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              // TODO: Open menu
            }}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Start Chat Input */}
      <View style={[styles.startChatContainer, { backgroundColor: theme.colors.backgroundCard }]}>
        <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            placeholder="Start chat with username"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            value={peer}
            onChangeText={setPeer}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={startChat}
            returnKeyType="go"
          />
          <TouchableOpacity
            onPress={startChat}
            style={[
              styles.startButton,
              {
                backgroundColor: peer.trim() ? theme.colors.primary : theme.colors.border,
              },
            ]}
            disabled={!peer.trim()}
          >
            <Text
              style={[
                styles.startButtonText,
                {
                  color: peer.trim() ? theme.colors.textInverse : theme.colors.textTertiary,
                },
              ]}
            >
              Start
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredConvos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationListItem
              peerUsername={item.peer}
              lastMessage={item.lastMessage}
              timestamp={item.timestamp}
              unreadCount={item.unread}
              isEncrypted={true}
              isSelected={selectedChat === item.peer}
              onPress={() => {
                if (onSelectChat) {
                  onSelectChat(item.peer);
                }
              }}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {me ? `Signed in as ${me}. No conversations yet.` : 'No conversations yet.'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                Start a new chat by entering a username above.
              </Text>
            </View>
          }
          contentContainerStyle={filteredConvos.length === 0 ? styles.emptyList : undefined}
        />
        
        {/* Settings Button - Lower Left Corner */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings' as never)}
          style={[styles.settingsButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDEF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#54656F',
  },
  startChatContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDEF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 4,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 3.84px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    }),
  },
  settingsIcon: {
    fontSize: 24,
  },
});
