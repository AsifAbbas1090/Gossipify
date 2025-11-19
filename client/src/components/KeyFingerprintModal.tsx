import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { getTheme } from '../theme';

export interface KeyFingerprintModalProps {
  visible: boolean;
  fingerprint: string;
  peerUsername: string;
  onClose: () => void;
  onVerify?: () => void;
}

export default function KeyFingerprintModal({
  visible,
  fingerprint,
  peerUsername,
  onClose,
  onVerify,
}: KeyFingerprintModalProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);

  const formatFingerprint = (fp: string) => {
    // Format as groups of 4 characters
    return fp.match(/.{1,4}/g)?.join(' ') || fp;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.backgroundCard,
            },
          ]}
        >
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              Verify Security
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Confirm this fingerprint with {peerUsername} through a secure channel
            </Text>
          </View>

          <View
            style={[
              styles.fingerprintContainer,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.fingerprintLabel,
                {
                  color: theme.colors.textTertiary,
                },
              ]}
            >
              Public Key Fingerprint
            </Text>
            <Text
              style={[
                styles.fingerprint,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
              selectable
            >
              {formatFingerprint(fingerprint)}
            </Text>
          </View>

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.colors.primarySubtle,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.infoText,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              🔒 Compare this fingerprint with {peerUsername} in person or through a
              verified channel to ensure your conversation is secure.
            </Text>
          </View>

          <View style={styles.actions}>
            {onVerify && (
              <TouchableOpacity
                onPress={onVerify}
                style={[
                  styles.button,
                  styles.verifyButton,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: theme.colors.textInverse,
                    },
                  ]}
                >
                  Mark as Verified
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.button,
                styles.closeButton,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  fingerprintContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  fingerprintLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fingerprint: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 2,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButton: {},
  closeButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

