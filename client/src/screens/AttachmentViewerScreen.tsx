import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTheme } from '../theme';
import { downloadAndDecryptAttachment } from '../lib/attachments';
import { AttachmentCard } from '../components';

type Props = NativeStackScreenProps<any, 'AttachmentViewer'>;

export default function AttachmentViewerScreen({ route, navigation }: Props) {
  const { attachmentId, nonce, name, mime, conversationKey } = route.params;
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const [decrypting, setDecrypting] = useState(true);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const decryptAttachment = async () => {
      try {
        setDecrypting(true);
        setDecryptProgress(0);
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setDecryptProgress((prev) => {
            if (prev >= 0.9) {
              clearInterval(progressInterval);
              return 0.9;
            }
            return prev + 0.1;
          });
        }, 100);

        const result = await downloadAndDecryptAttachment(
          attachmentId,
          nonce,
          conversationKey
        );

        clearInterval(progressInterval);
        setDecryptProgress(1);

        if (result.mime.startsWith('image/')) {
          setImageUri(`data:${result.mime};base64,${result.base64}`);
        }

        setDecrypting(false);
      } catch (e: any) {
        setError(e?.message || 'Failed to decrypt attachment');
        setDecrypting(false);
      }
    };

    if (attachmentId && nonce && conversationKey) {
      decryptAttachment();
    }
  }, [attachmentId, nonce, conversationKey]);

  const handleShare = async () => {
    if (!imageUri) return;
    try {
      await Share.share({
        message: imageUri,
        url: imageUri,
        title: name,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share attachment');
    }
  };

  const isImage = mime?.startsWith('image/');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark
            ? 'rgba(0, 0, 0, 0.95)'
            : 'rgba(0, 0, 0, 0.9)',
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.closeButton,
            {
              backgroundColor: theme.colors.backgroundCard,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.closeButtonText,
              {
                color: theme.colors.textPrimary,
              },
            ]}
          >
            ← Back
          </Text>
        </TouchableOpacity>
        {imageUri && (
          <TouchableOpacity
            onPress={handleShare}
            style={[
              styles.shareButton,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.shareButtonText,
                {
                  color: theme.colors.textInverse,
                },
              ]}
            >
              Share
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {decrypting ? (
          <View style={styles.decryptingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
              style={styles.loader}
            />
            <Text
              style={[
                styles.decryptingText,
                {
                  color: theme.colors.textInverse,
                },
              ]}
            >
              Decrypting attachment...
            </Text>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: `${decryptProgress * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text
              style={[
                styles.errorText,
                {
                  color: theme.colors.destructive,
                },
              ]}
            >
              ⚠️ {error}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                styles.retryButton,
                {
                  backgroundColor: theme.colors.backgroundCard,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.retryButtonText,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        ) : isImage && imageUri ? (
          <ScrollView
            contentContainerStyle={styles.imageContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          </ScrollView>
        ) : (
          <View style={styles.nonImageContainer}>
            <AttachmentCard
              name={name || 'Attachment'}
              mime={mime}
              isDecrypting={false}
              onPress={() => {}}
            />
            <Text
              style={[
                styles.infoText,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              This file type cannot be previewed. It has been decrypted and is
              available in your device storage.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  decryptingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loader: {
    marginBottom: 24,
  },
  decryptingText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressBar: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  nonImageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

