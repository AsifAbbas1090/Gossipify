import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';
import { getStoredKeypair, storeKeypair, fingerprintPublicKey } from '../lib/crypto';
import { getUsername, saveUsername } from '../lib/storage';
import { getTheme } from '../theme';
import { SecurityBanner } from '../components';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

async function deriveKey(pass: string): Promise<string> {
  // Demo-only: PBKDF2-like via SHA-256 iterations; recommend Argon2id in production
  let data = pass;
  for (let i = 0; i < 10000; i++) {
    data = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }
  return data; // hex string
}

function xorHex(a: string, b: string): string {
  const len = Math.min(a.length, b.length);
  let out = '';
  for (let i = 0; i < len; i += 2) {
    const x = parseInt(a.substr(i, 2), 16) ^ parseInt(b.substr(i, 2), 16);
    out += x.toString(16).padStart(2, '0');
  }
  return out;
}

export default function SettingsScreen() {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [publicKeyFingerprint, setPublicKeyFingerprint] = useState<string>('');

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    (async () => {
      const u = await getUsername();
      if (u) setUsername(u);
      const kp = await getStoredKeypair();
      if (kp) {
        setPublicKeyFingerprint(fingerprintPublicKey(kp.publicKey));
      }
    })();
  }, []);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 15 });
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const onExport = async () => {
    try {
      setBusy(true);
      const kp = await getStoredKeypair();
      const uname = (await getUsername()) || '';
      if (!kp) throw new Error('Missing keypair');
      const pass = 'demo-passphrase'; // Replace with UI prompt for passphrase in production
      const k = await deriveKey(pass);
      const payload = JSON.stringify(kp);
      const payloadHex = Buffer.from(payload, 'utf8').toString('hex');
      const mask = k.repeat(Math.ceil(payloadHex.length / k.length)).slice(0, payloadHex.length);
      const sealed = xorHex(payloadHex, mask);
      const file = FileSystem.documentDirectory + `gossipify-backup-${uname || 'user'}.bak`;
      await FileSystem.writeAsStringAsync(file, sealed, { encoding: FileSystem.EncodingType.UTF8 });
      Alert.alert('Exported', 'Backup written to app documents directory');
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    try {
      setBusy(true);
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (res.canceled) return;
      const file = res.assets[0];
      const sealed = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const pass = 'demo-passphrase'; // Replace with UI prompt in production
      const k = await deriveKey(pass);
      const mask = k.repeat(Math.ceil(sealed.length / k.length)).slice(0, sealed.length);
      const payloadHex = xorHex(sealed, mask);
      const payload = Buffer.from(payloadHex, 'hex').toString('utf8');
      const kp = JSON.parse(payload);
      await storeKeypair(kp);
      Alert.alert('Imported', 'Keypair restored. Restart app to ensure state.');
    } catch (e: any) {
      Alert.alert('Import failed', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    try {
      await saveUsername(username.trim());
      Alert.alert('Saved', 'Username updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save username');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={animatedStyle}>
          <SecurityBanner />
        </Animated.View>

        <Animated.View style={animatedStyle}>
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.backgroundCard,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              Profile
            </Text>
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                Username
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: isFocused
                        ? theme.colors.borderFocus
                        : theme.colors.border,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  editable={!busy}
                />
                <TouchableOpacity
                  disabled={busy || !username.trim()}
                  onPress={handleSaveUsername}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor:
                        busy || !username.trim()
                          ? theme.colors.border
                          : theme.colors.primary,
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textInverse}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.saveButtonText,
                        {
                          color: theme.colors.textInverse,
                        },
                      ]}
                    >
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={animatedStyle}>
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.backgroundCard,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              Security
            </Text>
            {publicKeyFingerprint && (
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
                  Your Public Key Fingerprint
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
                  {publicKeyFingerprint.match(/.{1,4}/g)?.join(' ') || publicKeyFingerprint}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View style={animatedStyle}>
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.backgroundCard,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textPrimary,
                },
              ]}
            >
              Backup & Restore
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Export your encryption keys for backup. Keep backups secure and
              never share them.
            </Text>
            <TouchableOpacity
              disabled={busy}
              onPress={onExport}
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: busy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.actionButtonIcon}>💾</Text>
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: theme.colors.textInverse,
                  },
                ]}
              >
                Export Key Backup
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy}
              onPress={onImport}
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  opacity: busy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.actionButtonIcon}>📥</Text>
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                Import Key Backup
              </Text>
            </TouchableOpacity>
            <View
              style={[
                styles.noteContainer,
                {
                  backgroundColor: theme.colors.primarySubtle,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.noteText,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                ⚠️ Note: Backups are encrypted with a demo passphrase. For
                production, prompt user and use a memory-hard KDF (Argon2id).
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fingerprintContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  fingerprintLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fingerprint: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  noteContainer: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
});


