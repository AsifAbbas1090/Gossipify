import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { generateKeypair, getStoredKeypair } from '../lib/crypto';
import { getUsername, saveUsername } from '../lib/storage';
import { register } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const scheme = useColorScheme();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const kp = await getStoredKeypair();
      const uname = await getUsername();
      if (kp && uname) {
        navigation.replace('Home');
      }
    })();
  }, [navigation]);

  const onContinue = async () => {
    if (!username.trim()) return;
    try {
      setBusy(true);
      const uname = username.trim();
      const existing = await getStoredKeypair();
      const kp = existing || await generateKeypair();
      await register(uname, kp.publicKey);
      await saveUsername(uname);
      navigation.replace('Home');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to register');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: scheme === 'dark' ? '#0b1020' : '#f8fafc' }]}>
      <Text style={[styles.title, { color: scheme === 'dark' ? '#f8fafc' : '#0f172a' }]}>Gossipify</Text>
      <Text style={[styles.subtitle, { color: scheme === 'dark' ? '#94a3b8' : '#334155' }]}>Share your gossips here</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>End-to-end encryption</Text>
        <Text style={styles.cardText}>Your keys are generated locally and private keys never leave your device. The server cannot read your messages.</Text>
      </View>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Choose a username"
        autoCapitalize="none"
        style={styles.input}
      />
      <TouchableOpacity disabled={busy} onPress={onContinue} style={[styles.button, { opacity: busy ? 0.6 : 1 }]}> 
        <Text style={styles.buttonText}>{busy ? 'Setting up…' : 'Continue'}</Text>
      </TouchableOpacity>
      <Text style={styles.notice}>
        Gossipify is an educational demo implementing client-side encryption. It never attempts to access a user’s files without explicit permission.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 40, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 24 },
  card: { width: '100%', backgroundColor: '#111827', padding: 16, borderRadius: 16, marginBottom: 24 },
  cardTitle: { color: '#f9fafb', fontWeight: '700', marginBottom: 6 },
  cardText: { color: '#e5e7eb' },
  input: { width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12, borderColor: '#e5e7eb', borderWidth: 1 },
  button: { width: '100%', backgroundColor: '#14b8a6', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700' },
  notice: { textAlign: 'center', marginTop: 16, color: '#64748b' },
});


