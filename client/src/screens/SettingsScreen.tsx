import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { getStoredKeypair, storeKeypair } from '../lib/crypto';
import { getUsername, saveUsername } from '../lib/storage';

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
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    (async () => { const u = await getUsername(); if (u) setUsername(u); })();
  }, []);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Your username</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput value={username} onChangeText={setUsername} placeholder="Enter username" autoCapitalize="none" style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' }} />
        <TouchableOpacity disabled={busy || !username.trim()} onPress={async () => { try { await saveUsername(username.trim()); Alert.alert('Saved', 'Username updated'); } catch {} }} style={[styles.button, { backgroundColor: '#14b8a6' }]}><Text style={styles.buttonText}>Save</Text></TouchableOpacity>
      </View>
      <TouchableOpacity disabled={busy} onPress={onExport} style={styles.button}><Text style={styles.buttonText}>Export Key Backup</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} onPress={onImport} style={styles.button}><Text style={styles.buttonText}>Import Key Backup</Text></TouchableOpacity>
      <Text style={styles.note}>Note: Backups are encrypted with a demo passphrase. For production, prompt user and use a memory-hard KDF (Argon2id).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  button: { backgroundColor: '#111827', padding: 12, borderRadius: 12, marginBottom: 12 },
  buttonText: { color: 'white', fontWeight: '700', textAlign: 'center' },
  note: { color: '#64748b' },
});


