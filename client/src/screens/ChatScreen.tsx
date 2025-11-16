import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, Image, useColorScheme } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getStoredKeypair, deriveSharedKey, encryptMessage, decryptMessage, fingerprintPublicKey } from '../lib/crypto';
import { getPublicKey, poll, sendMessage, deleteMessage } from '../lib/api';
import { pickAttachment, encryptAndUploadAttachment, downloadAndDecryptAttachment } from '../lib/attachments';
import { getUsername } from '../lib/storage';
import { Buffer } from 'buffer';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

type ChatItem = {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
  attachment?: { id: string; nonce: string; name: string; mime?: string | null } | null;
  status?: 'sent' | 'deleted';
};

export default function ChatScreen({ route }: Props) {
  const { peerUsername } = route.params;
  const [input, setInput] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selfDestructSec, setSelfDestructSec] = useState<number | null>(null);
  const scheme = useColorScheme();
  const convoKeyRef = useRef<Uint8Array | null>(null);
  const meRef = useRef<string>('');
  const [since, setSince] = useState<number>(0);
  const meUserRef = useRef<string>('');
  const sinceRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const me = await getStoredKeypair();
      if (!me) {
        Alert.alert('Error', 'Missing keys. Please restart and register.');
        return;
      }
      meUserRef.current = (await getUsername()) || '';
      meRef.current = me.publicKey;
      const peerPub = await getPublicKey(peerUsername);
      if (!peerPub) {
        Alert.alert('Error', 'Peer not found on server.');
        return;
      }
      convoKeyRef.current = deriveSharedKey(me.secretKey, peerPub);
      const start = Date.now() - 1000 * 60 * 60; // last hour
      sinceRef.current = start;
      setSince(start);
    })();
  }, [peerUsername]);

  useEffect(() => {
    let timer: any;
    const loop = async () => {
      try {
        const user = meUserRef.current;
        if (!user) { /* no username available yet */ timer = setTimeout(loop, 1500); return; }
        const sinceLocal = sinceRef.current;
        const r = await poll(user, sinceLocal);
        let updatedSince = sinceLocal;
        setItems(prev => {
          const existing = new Set(prev.map(p => p.id));
          const next = [...prev];
          for (const m of r.messages as any[]) {
            const key = convoKeyRef.current;
            if (!key) continue;
            updatedSince = Math.max(updatedSince, m.timestamp + 1);
            if (existing.has(m.id)) continue;
            if (m.attachmentId) {
              next.push({ id: m.id, fromMe: false, text: '(attachment)', timestamp: m.timestamp, attachment: { id: m.attachmentId, nonce: m.nonce, name: 'Attachment', mime: null } });
              existing.add(m.id);
              continue;
            }
            const opened = decryptMessage(m.ciphertext, m.nonce, key);
            if (!opened) continue;
            const text = Buffer.from(opened).toString('utf8');
            next.push({ id: m.id, fromMe: false, text, timestamp: m.timestamp, attachment: null });
            existing.add(m.id);
          }
          if (r.deletions && Array.isArray(r.deletions)) {
            for (const d of r.deletions as any[]) {
              updatedSince = Math.max(updatedSince, (d.deletedAt || 0) + 1);
            }
            return next.filter(i => !r.deletions.find((d: any) => d.id === i.id));
          }
          return next;
        });
        if (updatedSince !== sinceLocal) {
          sinceRef.current = updatedSince;
          setSince(updatedSince);
        }
      } catch {}
      timer = setTimeout(loop, 1500);
    };
    loop();
    return () => clearTimeout(timer);
  }, [peerUsername, since]);

  function convertShortcodes(text: string): string {
    const map: Record<string, string> = {
      ':smile:': '😄',
      ':grin:': '😁',
      ':heart:': '❤️',
      ':thumbs_up:': '👍',
      ':thumbsup:': '👍',
      ':fire:': '🔥',
      ':cry:': '😢',
      ':laugh:': '😂',
    };
    return text.replace(/:[a-z_]+:/g, m => map[m] || m);
  }

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const me = await getStoredKeypair();
    if (!me) return;
    const key = convoKeyRef.current;
    if (!key) return;
    const bytes = Uint8Array.from(Buffer.from(convertShortcodes(text), 'utf8'));
    const { nonce, ciphertext } = encryptMessage(bytes, key);
    const payload = {
      from: meUserRef.current || me.publicKey,
      to: peerUsername,
      ciphertext,
      nonce,
      fingerprint: fingerprintPublicKey(me.publicKey),
      timestamp: Date.now(),
    };
    const resp = await sendMessage(payload);
    const msgId = resp?.id || Math.random().toString(36);
    setItems(prev => [...prev, { id: msgId, fromMe: true, text, timestamp: payload.timestamp, attachment: null, status: 'sent' }]);
    if (selfDestructSec) {
      setTimeout(async () => {
        setItems(prev => prev.filter(i => i.id !== msgId));
        try { await deleteMessage(msgId, meUserRef.current || me.publicKey); } catch {}
      }, selfDestructSec * 1000);
    }
  };

  const onAddEmoji = (emoji: string) => {
    setInput(prev => prev + (emoji || ''));
  };

  const onAttach = async () => {
    try {
      const key = convoKeyRef.current;
      if (!key) return;
      const att = await pickAttachment();
      if (!att) return;
      const enc = await encryptAndUploadAttachment(att, key);
      // Send a message with empty text but attachmentId metadata
      const me = await getStoredKeypair();
      if (!me) return;
      const payload = {
        from: meUserRef.current || me.publicKey,
        to: peerUsername,
        ciphertext: '',
        nonce: enc.nonce,
        fingerprint: fingerprintPublicKey(me.publicKey),
        timestamp: Date.now(),
        attachmentId: enc.id,
      };
      const resp = await sendMessage(payload);
      const msgId = resp?.id || Math.random().toString(36);
      setItems(prev => [...prev, { id: msgId, fromMe: true, text: enc.name, timestamp: payload.timestamp, attachment: { id: enc.id, nonce: enc.nonce, name: enc.name, mime: enc.mime }, status: 'sent' }]);
      if (selfDestructSec) {
        setTimeout(async () => {
          setItems(prev => prev.filter(i => i.id !== msgId));
          try { await deleteMessage(msgId, meUserRef.current || me.publicKey); } catch {}
        }, selfDestructSec * 1000);
      }
    } catch (e) {
      Alert.alert('Attachment', 'Failed to attach file');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => {
              if (!item.fromMe) return;
              Alert.alert('Message', 'Choose an action', [
                { text: 'Delete (local)', onPress: () => setItems(prev => prev.filter(i => i.id !== item.id)) },
                { text: 'Delete for everyone', style: 'destructive', onPress: async () => { try { await deleteMessage(item.id, meUserRef.current || meRef.current); setItems(prev => prev.filter(i => i.id !== item.id)); } catch {} } },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            onPress={async () => {
              if (!item.attachment) return;
              try {
                if (item.attachment.mime && item.attachment.mime.startsWith('image/')) {
                  const key = convoKeyRef.current; if (!key) return;
                  const result = await downloadAndDecryptAttachment(item.attachment.id, item.attachment.nonce, key);
                  const mime = item.attachment.mime || result.mime || 'image/*';
                  setPreviewImage(`data:${mime};base64,${result.base64}`);
                } else {
                  Alert.alert('Attachment', 'Downloaded (not previewable).');
                }
              } catch {
                Alert.alert('Attachment', 'Failed to download/decrypt');
              }
            }}
          >
            <View style={[
              styles.bubble,
              item.fromMe ? styles.bubbleMe : styles.bubbleOther,
              { backgroundColor: item.fromMe ? (scheme === 'dark' ? '#0ea5e9' : '#14b8a6') : (scheme === 'dark' ? '#111827' : 'white'), borderColor: scheme === 'dark' ? '#1f2937' : '#e2e8f0' }
            ]}>
              {item.attachment ? (
                <Text style={{ color: item.fromMe ? 'white' : (scheme === 'dark' ? '#e5e7eb' : '#0f172a'), textDecorationLine: 'underline' }}>{`Attachment: ${item.attachment.name}`}</Text>
              ) : (
                <Text style={{ color: item.fromMe ? 'white' : (scheme === 'dark' ? '#e5e7eb' : '#0f172a') }}>{item.text}</Text>
              )}
              {item.fromMe && item.status === 'sent' && <Text style={{ color: item.fromMe ? 'white' : '#64748b', fontSize: 10, marginTop: 4 }}>✓ sent</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
      <View style={styles.composer}>
        <TouchableOpacity onPress={() => setEmojiOpen(v => !v)} style={styles.emoji}><Text style={{ fontSize: 22 }}>😊</Text></TouchableOpacity>
        <TouchableOpacity onPress={onAttach} style={styles.emoji}><Text style={{ fontSize: 22 }}>📎</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setSelfDestructSec(prev => prev ? null : 10)} style={[styles.emoji, { backgroundColor: selfDestructSec ? '#ef4444' : '#f1f5f9' }]}><Text style={{ fontSize: 18, color: selfDestructSec ? 'white' : '#111827' }}>⏱</Text></TouchableOpacity>
        <TextInput value={input} onChangeText={setInput} placeholder=":) type a message" style={styles.input} />
        <TouchableOpacity onPress={onSend} style={styles.send}><Text style={styles.sendText}>Send</Text></TouchableOpacity>
      </View>
      <Modal visible={emojiOpen} transparent animationType="slide" onRequestClose={() => setEmojiOpen(false)}>
        <View style={styles.emojiModal}>
          <View style={{ backgroundColor: scheme === 'dark' ? '#0b1020' : 'white', paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['😀','😁','😂','🤣','😊','😍','😘','😎','🤩','😇','🙂','😉','😌','😜','🤔','😴','😢','😭','😡','🔥','✨','👍','👏','🙏','💯','🎉','❤️','💙','💚','💛','🧡','💜','🤍','🤝','👌','✌️','🤞','👀','👋'].map(e => (
                <TouchableOpacity key={e} onPress={() => onAddEmoji(e)} style={{ padding: 8 }}><Text style={{ fontSize: 28 }}>{e}</Text></TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.emojiClose} onPress={() => setEmojiOpen(false)}><Text style={{ color: 'white' }}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          {previewImage && <Image source={{ uri: previewImage }} style={{ width: '90%', height: '70%', resizeMode: 'contain' }} />}
          <TouchableOpacity onPress={() => setPreviewImage(null)} style={{ marginTop: 12, backgroundColor: '#111827', padding: 10, borderRadius: 8 }}><Text style={{ color: 'white' }}>Close</Text></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  bubble: { margin: 8, padding: 12, borderRadius: 16, maxWidth: '80%' },
  bubbleMe: { backgroundColor: '#14b8a6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  composer: { flexDirection: 'row', padding: 8, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e2e8f0' },
  emoji: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 10, justifyContent: 'center', marginRight: 6 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  send: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: 'white', fontWeight: '700' },
  emojiModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  emojiClose: { backgroundColor: '#111827', padding: 12, alignItems: 'center' },
});


