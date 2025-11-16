import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { getUsername } from '../lib/storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Conversation = { id: string; peer: string; last: string; unread: number };

export default function HomeScreen({ navigation }: Props) {
  const [peer, setPeer] = useState('');
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [me, setMe] = useState<string>('');

  useEffect(() => { (async () => { const u = await getUsername(); if (u) setMe(u); })(); }, []);

  const startChat = () => {
    if (!peer.trim()) return;
    navigation.navigate('Chat', { peerUsername: peer.trim() });
  };

  return (
    <View style={styles.container}>
      <View style={styles.newRow}>
        <TextInput style={styles.input} placeholder="Start chat with username" autoCapitalize="none" value={peer} onChangeText={setPeer} />
        <TouchableOpacity onPress={startChat} style={styles.button}><Text style={styles.buttonText}>Chat</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.button, { backgroundColor: '#111827' }]}><Text style={styles.buttonText}>Settings</Text></TouchableOpacity>
      </View>
      <FlatList
        data={convos}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Chat', { peerUsername: item.peer })}>
            <Text style={styles.cardTitle}>{item.peer}</Text>
            <Text style={styles.cardSubtitle}>{item.last}</Text>
            {item.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ color: '#64748b', textAlign: 'center', marginTop: 16 }}>{me ? `Signed in as ${me}. No conversations yet` : 'No conversations yet'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  newRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#14b8a6', paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  buttonText: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontWeight: '700', fontSize: 16 },
  cardSubtitle: { color: '#64748b', marginTop: 4 },
  badge: { position: 'absolute', right: 12, top: 12, backgroundColor: '#ef4444', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: 'white', fontWeight: '700' },
});


