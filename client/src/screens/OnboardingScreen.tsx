import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { generateKeypair, getStoredKeypair } from '../lib/crypto';
import { getUsername, saveUsername } from '../lib/storage';
import { register } from '../lib/api';
import { getTheme } from '../theme';
import { SecurityBanner } from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const inputOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    (async () => {
      const kp = await getStoredKeypair();
      const uname = await getUsername();
      if (kp && uname) {
        navigation.replace('Main');
      }
    })();
  }, [navigation]);

  useEffect(() => {
    // Entrance animations
    titleOpacity.value = withSpring(1, { damping: 15 });
    titleTranslateY.value = withSpring(0, { damping: 15 });
    subtitleOpacity.value = withDelay(100, withSpring(1, { damping: 15 }));
    subtitleTranslateY.value = withDelay(100, withSpring(0, { damping: 15 }));
    cardOpacity.value = withDelay(200, withSpring(1, { damping: 15 }));
    cardScale.value = withDelay(200, withSpring(1, { damping: 15 }));
    inputOpacity.value = withDelay(300, withSpring(1, { damping: 15 }));
    buttonOpacity.value = withDelay(400, withSpring(1, { damping: 15 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const onContinue = async () => {
    if (!username.trim()) return;
    try {
      setBusy(true);
      const uname = username.trim().toLowerCase(); // Normalize to lowercase
      const existing = await getStoredKeypair();
      const kp = existing || (await generateKeypair());
      await register(uname, kp.publicKey);
      await saveUsername(uname);
      navigation.replace('Main');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to register');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={titleStyle}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
              },
            ]}
          >
            Gossipify
          </Text>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            Share your gossips here
          </Text>
        </Animated.View>

        <Animated.View style={cardStyle}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.primarySubtle,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardIcon, { color: theme.colors.primary }]}>
                🔒
              </Text>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
              >
                End-to-end encryption
              </Text>
            </View>
            <Text
              style={[
                styles.cardText,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Your encryption keys are generated locally on your device. Private
              keys never leave your device and are stored securely. The server
              cannot read your messages.
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={inputStyle}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textPrimary,
              },
            ]}
          >
            Choose a username
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.backgroundCard,
                borderColor: isFocused
                  ? theme.colors.borderFocus
                  : theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            editable={!busy}
            accessibilityLabel="Username input"
          />
        </Animated.View>

        <Animated.View style={buttonStyle}>
          <TouchableOpacity
            disabled={busy || !username.trim()}
            onPress={onContinue}
            style={[
              styles.button,
              {
                backgroundColor:
                  busy || !username.trim()
                    ? theme.colors.border
                    : theme.colors.primary,
                opacity: busy || !username.trim() ? 0.6 : 1,
              },
            ]}
            accessibilityLabel="Continue to app"
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.colors.textInverse,
                  },
                ]}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.noticeContainer}>
          <SecurityBanner variant="compact" />
          <Text
            style={[
              styles.notice,
              {
                color: theme.colors.textTertiary,
              },
            ]}
          >
            Gossipify is an educational demo implementing client-side encryption.
            It never attempts to access a user's files without explicit
            permission.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    width: '100%',
  },
  input: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  noticeContainer: {
    width: '100%',
    marginTop: 32,
  },
  notice: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
  },
});


