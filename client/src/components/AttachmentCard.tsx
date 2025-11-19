import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { getTheme } from '../theme';

export interface AttachmentCardProps {
  name: string;
  mime?: string | null;
  size?: number | null;
  thumbnailUri?: string | null;
  isDecrypting?: boolean;
  decryptProgress?: number; // 0-1
  onPress: () => void;
  onLongPress?: () => void;
}

export default function AttachmentCard({
  name,
  mime,
  size,
  thumbnailUri,
  isDecrypting = false,
  decryptProgress = 0,
  onPress,
  onLongPress,
}: AttachmentCardProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const [imageError, setImageError] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 15 });
    scale.value = withSpring(1, { damping: 15 });
  }, []);

  useEffect(() => {
    if (isDecrypting) {
      progressWidth.value = withTiming(decryptProgress, { duration: 300 });
    }
  }, [decryptProgress, isDecrypting]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const isImage = mime?.startsWith('image/');
  const fileExtension = name.split('.').pop()?.toUpperCase() || 'FILE';

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (mime?.startsWith('image/')) return '🖼️';
    if (mime?.startsWith('video/')) return '🎥';
    if (mime?.startsWith('audio/')) return '🎵';
    if (mime?.includes('pdf')) return '📄';
    if (mime?.includes('word') || mime?.includes('document')) return '📝';
    return '📎';
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.backgroundCard,
            borderColor: theme.colors.border,
          },
        ]}
        accessibilityLabel={`Attachment: ${name}`}
        accessibilityRole="button"
      >
        {isImage && thumbnailUri && !imageError ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.thumbnail}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.primarySubtle,
              },
            ]}
          >
            <Text style={styles.iconText}>{getFileIcon()}</Text>
            {!isImage && (
              <Text
                style={[
                  styles.extensionText,
                  {
                    color: theme.colors.primary,
                  },
                ]}
              >
                {fileExtension}
              </Text>
            )}
          </View>
        )}

        <View style={styles.content}>
          <Text
            style={[
              styles.name,
              {
                color: theme.colors.textPrimary,
              },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {size && (
            <Text
              style={[
                styles.size,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {formatSize(size)}
            </Text>
          )}
          {isDecrypting && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: theme.colors.border,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.colors.primary,
                    },
                    progressStyle,
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.decryptingText,
                  {
                    color: theme.colors.textTertiary,
                  },
                ]}
              >
                Decrypting...
              </Text>
            </View>
          )}
        </View>

        {isDecrypting && (
          <View style={styles.loader}>
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
            />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 4,
    marginHorizontal: 16,
    minHeight: 80,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  extensionText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  size: {
    fontSize: 12,
    fontWeight: '400',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  decryptingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  loader: {
    marginLeft: 8,
  },
});

