/**
 * ChatBubble - WhatsApp Web Style
 * Exact WhatsApp message bubble styling
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Image, Platform, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { getTheme } from '../theme';

export interface ChatBubbleProps {
  text: string;
  isFromMe: boolean;
  timestamp: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  attachment?: {
    name: string;
    mime?: string | null;
    isDecrypting?: boolean;
    uri?: string;
    id?: string;
    nonce?: string;
  } | null;
  onLongPress?: () => void;
  onPress?: () => void;
  showEncryptionShimmer?: boolean;
  onDecryptAttachment?: (id: string, nonce: string) => Promise<string | null>;
}

export default function ChatBubble({
  text,
  isFromMe,
  timestamp,
  status,
  attachment,
  onLongPress,
  onPress,
  showEncryptionShimmer = false,
  onDecryptAttachment,
}: ChatBubbleProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const [imageUri, setImageUri] = useState<string | null>(attachment?.uri || null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 15 });
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  useEffect(() => {
    // If attachment has ID but no URI, try to decrypt it automatically for images
    if (attachment && attachment.id && attachment.nonce && attachment.mime?.startsWith('image/') && !imageUri && onDecryptAttachment && !isLoadingImage) {
      setIsLoadingImage(true);
      onDecryptAttachment(attachment.id, attachment.nonce)
        .then((uri) => {
          if (uri) setImageUri(uri);
          setIsLoadingImage(false);
        })
        .catch(() => {
          setIsLoadingImage(false);
        });
    } else if (attachment?.uri) {
      setImageUri(attachment.uri);
    } else if (!attachment || !attachment.id) {
      setImageUri(null);
    }
  }, [attachment, imageUri, isLoadingImage, onDecryptAttachment]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    if (!isFromMe) return null;
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '✓';
    }
  };

  return (
    <Animated.View style={[
      styles.container, 
      animatedStyle,
      isFromMe ? styles.containerRight : styles.containerLeft
    ]}>
      <TouchableOpacity
        onLongPress={onLongPress}
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.bubble,
          isFromMe ? styles.bubbleSent : styles.bubbleReceived,
          {
            backgroundColor: isFromMe
              ? theme.colors.messageSent
              : theme.colors.messageReceived,
          },
        ]}
      >
        {attachment && attachment.mime?.startsWith('image/') ? (
          <View>
            {isLoadingImage ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={isFromMe ? '#FFFFFF' : '#54656F'} />
              </View>
            ) : imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: isFromMe ? '#FFFFFF' : '#54656F' }]}>
                  Tap to load image
                </Text>
              </View>
            )}
          </View>
        ) : attachment ? (
          <View>
            {attachment.mime?.startsWith('audio/') ? (
              <View style={styles.audioContainer}>
                <Text style={styles.audioIcon}>🎵</Text>
                <Text
                  style={[
                    styles.attachmentText,
                    {
                      color: isFromMe
                        ? theme.colors.textPrimary
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {attachment.name || 'Audio message'}
                </Text>
                {attachment.isDecrypting && (
                  <Text
                    style={[
                      styles.decryptingText,
                      {
                        color: isFromMe
                          ? theme.colors.textSecondary
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    Decrypting...
                  </Text>
                )}
              </View>
            ) : (
              <View>
                <Text
                  style={[
                    styles.attachmentText,
                    {
                      color: isFromMe
                        ? theme.colors.textPrimary
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  📎 {attachment.name}
                </Text>
                {attachment.isDecrypting && (
                  <Text
                    style={[
                      styles.decryptingText,
                      {
                        color: isFromMe
                          ? theme.colors.textSecondary
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    Decrypting...
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : null}
        {text && (
          <Text
            style={[
              styles.text,
              {
                color: isFromMe
                  ? theme.colors.textPrimary
                  : theme.colors.textPrimary,
              },
            ]}
          >
            {text}
          </Text>
        )}
        <View style={styles.footer}>
          <Text
            style={[
              styles.timestamp,
              {
                color: isFromMe
                  ? theme.colors.textSecondary
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {formatTime(timestamp)}
          </Text>
          {isFromMe && status && (
            <Text
              style={[
                styles.status,
                {
                  color: status === 'read' 
                    ? '#53BDEB' 
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {getStatusIcon()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    marginHorizontal: 8,
    maxWidth: '65%',
  },
  containerLeft: {
    alignSelf: 'flex-start',
  },
  containerRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 7.5,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 0.5px rgba(0, 0, 0, 0.13)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.13,
        shadowRadius: 0.5,
        elevation: 1,
      },
    }),
  },
  bubbleSent: {
    borderTopRightRadius: 0,
  },
  bubbleReceived: {
    borderTopLeftRadius: 0,
  },
  text: {
    fontSize: 14.2,
    lineHeight: 19,
    fontWeight: '400',
  },
  attachmentText: {
    fontSize: 14.2,
    lineHeight: 19,
    fontWeight: '500',
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 4,
    marginBottom: 4,
    maxWidth: '100%',
  },
  loadingContainer: {
    width: 200,
    height: 200,
    borderRadius: 4,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioIcon: {
    fontSize: 24,
  },
  decryptingText: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 4,
  },
  timestamp: {
    fontSize: 11.5,
    fontWeight: '400',
    opacity: 0.7,
  },
  status: {
    fontSize: 11.5,
    fontWeight: '400',
    marginLeft: 2,
  },
});
