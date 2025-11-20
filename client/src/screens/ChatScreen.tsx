/**
 * ChatScreen - WhatsApp Web Style
 * Accepts peerUsername as prop or route param
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Alert,
  Modal,
  Image,
  useColorScheme,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getStoredKeypair,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  fingerprintPublicKey,
} from '../lib/crypto';
import { getPublicKey, poll, sendMessage, deleteMessage } from '../lib/api';
import {
  pickAttachment,
  encryptAndUploadAttachment,
  downloadAndDecryptAttachment,
} from '../lib/attachments';
import { getUsername } from '../lib/storage';
import { Buffer } from 'buffer';
import { getTheme } from '../theme';
import { ChatBubble, Composer, KeyFingerprintModal } from '../components';
import EmojiPicker from '../components/EmojiPicker';

interface ChatScreenProps {
  peerUsername: string;
  onBack?: () => void;
}

type ChatItem = {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
  attachment?: { id: string; nonce: string; name: string; mime?: string | null } | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'deleted';
  isDecrypting?: boolean;
};

export default function ChatScreen({ peerUsername, onBack }: ChatScreenProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const navigation = useNavigation();
  const [input, setInput] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selfDestructSec, setSelfDestructSec] = useState<number | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [peerFingerprint, setPeerFingerprint] = useState<string>('');
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [draftAttachment, setDraftAttachment] = useState<{ uri: string; mime?: string | null; name: string } | null>(null);
  const [peerNotFound, setPeerNotFound] = useState(false);
  const [isLoadingPeer, setIsLoadingPeer] = useState(true);

  const convoKeyRef = useRef<Uint8Array | null>(null);
  const meRef = useRef<string>('');
  const [since, setSince] = useState<number>(0);
  const meUserRef = useRef<string>('');
  const sinceRef = useRef<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const peerPubRef = useRef<string>('');
  const initialLoadRef = useRef<boolean>(true);
  const chatOpenTimeRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingPeer(true);
    setPeerNotFound(false);
    
    (async () => {
      try {
        const me = await getStoredKeypair();
        if (!me) {
          Alert.alert('Error', 'Missing keys. Please restart and register.');
          if (isMounted) setIsLoadingPeer(false);
          return;
        }
        meUserRef.current = (await getUsername()) || '';
        if (!meUserRef.current) {
          Alert.alert('Error', 'Your username is not set. Please restart the app.');
          if (isMounted) setIsLoadingPeer(false);
          return;
        }
        meRef.current = me.publicKey;
        const normalizedPeer = peerUsername.trim().toLowerCase();
        
        console.log('[ChatScreen] Looking up peer:', normalizedPeer);
        const peerPub = await getPublicKey(normalizedPeer);
        if (!isMounted) return;
        
        if (!peerPub) {
          console.error('[ChatScreen] Peer not found:', normalizedPeer);
          // Try to get server stats to show available users
          try {
            const statsRes = await fetch('http://localhost:4000/stats');
            if (statsRes.ok) {
              const stats = await statsRes.json();
              console.log('[ChatScreen] Available users on server:', stats.activeUsers);
            }
          } catch {}
          setPeerNotFound(true);
          setIsLoadingPeer(false);
          return;
        }
        console.log('[ChatScreen] Peer found, setting up conversation key');
        peerPubRef.current = peerPub;
        convoKeyRef.current = deriveSharedKey(me.secretKey, peerPub);
        setPeerFingerprint(fingerprintPublicKey(peerPub));
        setPeerNotFound(false);
        // Load ALL messages (since timestamp 0) when opening a chat
        sinceRef.current = 0;
        setSince(0);
        setIsLoadingPeer(false);
      } catch (e) {
        console.error('[ChatScreen] Error setting up peer:', e);
        if (isMounted) {
          setPeerNotFound(true);
          setIsLoadingPeer(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [peerUsername, navigation, onBack]);

  // Polling loop for messages - runs continuously
  useEffect(() => {
    let timer: any;
    let isMounted = true;
    // Capture peerUsername at the start of the effect to ensure consistency
    const currentPeer = peerUsername.trim().toLowerCase();
    
    // Reset items when peer changes to prevent cross-chat contamination
    if (currentPeer) {
      setItems([]);
      // Load ALL messages (since timestamp 0) when opening a chat
      sinceRef.current = 0;
      setSince(0);
      initialLoadRef.current = true;
      chatOpenTimeRef.current = Date.now();
    }
    
    const loop = async () => {
      try {
        const user = meUserRef.current;
        const key = convoKeyRef.current;
        
        // Double-check peer hasn't changed
        const currentPeerCheck = peerUsername.trim().toLowerCase();
        if (currentPeerCheck !== currentPeer) {
          // Peer changed, stop this loop
          return;
        }
        
        if (!user || !key || !currentPeer) {
          if (isMounted) timer = setTimeout(loop, 1000);
          return;
        }
        
        const sinceLocal = sinceRef.current;
        const r = await poll(user, sinceLocal);
        if (!isMounted) return;
        
        // Check again after async operation
        if (peerUsername.trim().toLowerCase() !== currentPeer) {
          return;
        }
        
        let updatedSince = sinceLocal;
        const myUsername = String(user || '').trim().toLowerCase();
        let hasNewMessages = false;
        let hasTrulyNewMessages = false; // Messages that arrived AFTER opening the chat
        
        setItems((prev) => {
          // Only process messages for THIS specific conversation
          const existing = new Set(prev.map((p) => p.id));
          const next = [...prev];
          
          for (const m of r.messages as any[]) {
            if (existing.has(m.id)) continue;
            
            const msgFrom = String(m.from || '').trim().toLowerCase();
            const msgTo = String(m.to || '').trim().toLowerCase();
            
            // STRICT FILTERING: Message must be EXACTLY between current user and current peer
            // Both users must match exactly (no partial matches)
            const isFromMeToPeer = msgFrom === myUsername && msgTo === currentPeer;
            const isFromPeerToMe = msgFrom === currentPeer && msgTo === myUsername;
            
            // Only process if it's one of these two exact scenarios
            if (!isFromMeToPeer && !isFromPeerToMe) {
              // This message is NOT for this conversation - skip it
              continue;
            }
            
            hasNewMessages = true;
            
            // Only scroll if this is a truly new message (arrived after chat was opened)
            // OR if it's from me (I just sent it)
            if (m.timestamp > chatOpenTimeRef.current || isFromMeToPeer) {
              hasTrulyNewMessages = true;
            }
            
            // Message is for this chat
            if (isFromMeToPeer) {
              // This is a message I sent to the current peer
              const tempId = sendingMessageId;
              if (tempId && m.id) {
                setSendingMessageId(null);
                const updated = next.map((item) =>
                  item.id === tempId ? { ...item, id: m.id, status: 'sent' as const } : item
                );
                return updated.sort((a, b) => a.timestamp - b.timestamp);
              }
              
              // Decrypt my own message to display it
              const text = m.ciphertext ? Buffer.from(decryptMessage(m.ciphertext, m.nonce, key) || Buffer.alloc(0)).toString('utf8') : '';
              next.push({
                id: m.id,
                fromMe: true,
                text,
                timestamp: m.timestamp,
                attachment: m.attachmentId ? { 
                  id: m.attachmentId, 
                  nonce: m.nonce, 
                  name: (m as any).name || 'Attachment', 
                  mime: (m as any).mime || null 
                } : null,
                status: 'sent',
              });
              existing.add(m.id);
            } else if (isFromPeerToMe) {
              // This is a message FROM the current peer TO me
              // CRITICAL: Verify this message is actually from the current peer by checking fingerprint
              const messageFingerprint = m.fingerprint || '';
              const currentPeerFingerprint = peerPubRef.current ? fingerprintPublicKey(peerPubRef.current) : '';
              
              // If we have fingerprints, they MUST match for this message to belong to this chat
              if (messageFingerprint && currentPeerFingerprint && messageFingerprint !== currentPeerFingerprint) {
                // This message is encrypted with a different key - it's from a different peer
                continue;
              }
              
              // Handle text messages
              let decryptedText: string | null = null;
              if (m.ciphertext && m.ciphertext.trim().length > 0) {
                try {
                  const opened = decryptMessage(m.ciphertext, m.nonce, key);
                  if (!opened) {
                    // Decryption failed - skip this message (wrong key = wrong conversation)
                    continue;
                  }
                  decryptedText = Buffer.from(opened).toString('utf8');
                } catch (error) {
                  // Decryption error - skip this message
                  continue;
                }
              }
              
              // Handle attachment messages (ciphertext may be empty)
              next.push({
                id: m.id,
                fromMe: false,
                text: decryptedText || (m.attachmentId ? ((m as any).name || 'Attachment') : ''),
                timestamp: m.timestamp,
                attachment: m.attachmentId ? {
                  id: m.attachmentId,
                  nonce: m.nonce,
                  name: (m as any).name || 'Attachment',
                  mime: (m as any).mime || null,
                } : null,
                status: undefined,
              });
              existing.add(m.id);
            }
            
            // Update since timestamp to latest message timestamp
            updatedSince = Math.max(updatedSince, m.timestamp);
          }
          
          if (r.deletions && Array.isArray(r.deletions)) {
            for (const d of r.deletions as any[]) {
              updatedSince = Math.max(updatedSince, (d.deletedAt || 0) + 1);
            }
            const filtered = next.filter(
              (i) => !r.deletions.find((d: any) => d.id === i.id)
            );
            return filtered.sort((a, b) => a.timestamp - b.timestamp);
          }
          return next.sort((a, b) => a.timestamp - b.timestamp);
        });
        
        // Update since timestamp to latest message we've seen
        if (hasNewMessages || updatedSince !== sinceLocal) {
          sinceRef.current = updatedSince;
          setSince(updatedSince);
        }
        
        // Only scroll if:
        // 1. Initial load is complete AND we have truly new messages (arrived after opening chat)
        // 2. OR if it's a message we just sent
        // Don't scroll on initial load of old messages
        if (initialLoadRef.current && hasNewMessages) {
          // First load complete - scroll to bottom once, then mark as loaded
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false }); // No animation on initial load
          }, 300);
          initialLoadRef.current = false;
        } else if (!initialLoadRef.current && hasTrulyNewMessages) {
          // Only scroll for truly new messages after initial load
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } catch (e) {
        console.error('[ChatScreen] Poll error:', e);
      }
      if (isMounted) {
        // Faster polling for real-time feel (800ms instead of 1500ms)
        timer = setTimeout(loop, 800);
      }
    };
    
    // Start polling immediately
    loop();
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [peerUsername, sendingMessageId]);

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
    return text.replace(/:[a-z_]+:/g, (m) => map[m] || m);
  }

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    
    // Check if we have the peer's public key (conversation key)
    if (!convoKeyRef.current) {
      Alert.alert(
        'Error',
        'Peer not found. Please make sure the user is registered and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setInput('');
    const me = await getStoredKeypair();
    if (!me) {
      Alert.alert('Error', 'Encryption keys not found. Please restart the app.');
      return;
    }
    const key = convoKeyRef.current;
    if (!key) {
      Alert.alert('Error', 'Cannot encrypt message. Peer key not available.');
      return;
    }
    if (!meUserRef.current) {
      const username = await getUsername();
      if (!username) {
        Alert.alert('Error', 'Username not found. Please restart the app.');
        return;
      }
      meUserRef.current = username;
    }
    
    const normalizedFrom = meUserRef.current.trim().toLowerCase();
    const normalizedTo = peerUsername.trim().toLowerCase();
    
    if (!normalizedFrom || !normalizedTo) {
      Alert.alert('Error', 'Invalid username. Please try again.');
      return;
    }
    
    try {
      const bytes = Uint8Array.from(Buffer.from(convertShortcodes(text), 'utf8'));
      const { nonce, ciphertext } = encryptMessage(bytes, key);
      const payload = {
        from: normalizedFrom,
        to: normalizedTo,
        ciphertext,
        nonce,
        fingerprint: fingerprintPublicKey(me.publicKey),
        timestamp: Date.now(),
      };
      const tempId = Math.random().toString(36);
      setSendingMessageId(tempId);
      const newMessage: ChatItem = {
        id: tempId,
        fromMe: true,
        text,
        timestamp: payload.timestamp,
        attachment: null,
        status: 'sending',
      };
      setItems((prev) => [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp));
      
      console.log('[ChatScreen] Sending message:', { from: normalizedFrom, to: normalizedTo });
      const resp = await sendMessage(payload);
      const msgId = resp?.id || tempId;
      console.log('[ChatScreen] Message sent successfully:', msgId);
      
      setSendingMessageId(null);
      setItems((prev) => {
        const updated = prev.map((item) =>
          item.id === tempId
            ? { ...item, id: msgId, status: 'sent' as const }
            : item
        );
        return updated.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      // Update since timestamp to trigger immediate poll
      sinceRef.current = payload.timestamp;
      setSince(payload.timestamp);
      
      // Scroll to bottom after sending (message already added to list)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      
      if (selfDestructSec) {
        setTimeout(async () => {
          setItems((prev) => prev.filter((i) => i.id !== msgId));
          try {
            await deleteMessage(msgId, normalizedFrom);
          } catch {}
        }, selfDestructSec * 1000);
      }
    } catch (e) {
      console.error('[ChatScreen] Send error:', e);
      setSendingMessageId(null);
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Failed to send message', errorMessage);
    }
  };

  const onAttach = async () => {
    try {
      const att = await pickAttachment();
      if (!att) return;
      
      // Show preview/draft for images
      if (att.mime && att.mime.startsWith('image/')) {
        // Convert file URI to data URI for preview (works for both web and native)
        let previewUri = att.uri;
        try {
          // For web, expo-document-picker might return a blob URL or file URI
          if (Platform.OS === 'web') {
            if (att.uri.startsWith('blob:') || att.uri.startsWith('http')) {
              const response = await fetch(att.uri);
              const blob = await response.blob();
              const reader = new FileReader();
              previewUri = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (reader.result) {
                    resolve(reader.result as string);
                  } else {
                    reject(new Error('Failed to read file'));
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } else if (!att.uri.startsWith('data:')) {
              // Try to read as base64
              const response = await fetch(att.uri);
              const blob = await response.blob();
              const reader = new FileReader();
              previewUri = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (reader.result) {
                    resolve(reader.result as string);
                  } else {
                    reject(new Error('Failed to read file'));
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }
          } else {
            // For native, read file as base64
            const { readAsStringAsync, EncodingType } = await import('expo-file-system');
            const base64 = await readAsStringAsync(att.uri, { encoding: EncodingType.Base64 });
            previewUri = `data:${att.mime};base64,${base64}`;
          }
        } catch (e) {
          console.error('Failed to create preview:', e);
          // Fallback to original URI
          previewUri = att.uri;
        }
        setDraftAttachment({ uri: previewUri, mime: att.mime, name: att.name });
        return; // Don't send yet, wait for user to confirm
      }
      
      // For non-images (audio, files), send immediately
      const key = convoKeyRef.current;
      if (!key) return;
      const enc = await encryptAndUploadAttachment(att, key);
      await sendAttachmentMessage(enc);
    } catch (e) {
      console.error('Attachment error:', e);
      Alert.alert('Attachment', 'Failed to attach file: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const sendAttachmentMessage = async (enc: { id: string; nonce: string; mime?: string | null; name: string }) => {
    try {
      const key = convoKeyRef.current;
      if (!key) return;
      const me = await getStoredKeypair();
      if (!me) return;
      if (!meUserRef.current) {
        const username = await getUsername();
        if (!username) {
          Alert.alert('Error', 'Username not found. Please restart the app.');
          return;
        }
        meUserRef.current = username;
      }
      const payload = {
        from: meUserRef.current.trim().toLowerCase(),
        to: peerUsername.trim().toLowerCase(),
        ciphertext: '',
        nonce: enc.nonce,
        fingerprint: fingerprintPublicKey(me.publicKey),
        timestamp: Date.now(),
        attachmentId: enc.id,
        mime: enc.mime || null,
        name: enc.name || 'Voice message',
      };
      const tempId = Math.random().toString(36);
      setSendingMessageId(tempId);
      const newAttachmentMessage: ChatItem = {
        id: tempId,
        fromMe: true,
        text: enc.name,
        timestamp: payload.timestamp,
        attachment: {
          id: enc.id,
          nonce: enc.nonce,
          name: enc.name,
          mime: enc.mime,
        },
        status: 'sending',
      };
      setItems((prev) => [...prev, newAttachmentMessage].sort((a, b) => a.timestamp - b.timestamp));
      try {
        const resp = await sendMessage(payload);
        const msgId = resp?.id || tempId;
        setSendingMessageId(null);
        setItems((prev) => {
          const updated = prev
            .map((item) =>
              item.id === tempId ? { ...item, id: msgId, status: 'sent' as const } : item
            )
            .sort((a, b) => a.timestamp - b.timestamp);
          return updated;
        });
        
        // Update since timestamp to trigger immediate poll
        sinceRef.current = payload.timestamp;
        setSince(payload.timestamp);
        
        // Scroll to bottom after sending attachment
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
        if (selfDestructSec) {
          setTimeout(async () => {
            setItems((prev) => prev.filter((i) => i.id !== msgId));
            try {
              await deleteMessage(msgId, meUserRef.current || me.publicKey);
            } catch {}
          }, selfDestructSec * 1000);
        }
      } catch (e) {
        setSendingMessageId(null);
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        console.error('Send attachment error:', e);
        Alert.alert('Error', 'Failed to send attachment: ' + (e instanceof Error ? e.message : 'Unknown error'));
      }
    } catch (e) {
      console.error('Attachment error:', e);
      Alert.alert('Error', 'Failed to send attachment: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleSendDraft = async () => {
    if (!draftAttachment) return;
    
    // Save draft before clearing
    const draftToSend = { ...draftAttachment };
    
    try {
      const key = convoKeyRef.current;
      if (!key) {
        Alert.alert('Error', 'Encryption key not available');
        return;
      }
      
      // Convert data URI back to file for encryption
      const att: { name: string; size?: number | null; mime?: string | null; uri: string } = {
        name: draftAttachment.name,
        mime: draftAttachment.mime,
        uri: draftAttachment.uri,
      };
      
      // Clear draft immediately to show it's being sent
      setDraftAttachment(null);
      
      const enc = await encryptAndUploadAttachment(att, key);
      await sendAttachmentMessage(enc);
    } catch (e) {
      console.error('Send draft error:', e);
      // Restore draft on error
      setDraftAttachment(draftToSend);
      Alert.alert('Error', 'Failed to send image: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleCancelDraft = () => {
    setDraftAttachment(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleMessageLongPress = (item: ChatItem) => {
              if (!item.fromMe) return;
    const options = ['Delete (local)', 'Delete for everyone', 'Cancel'];
    const destructiveButtonIndex = 1;
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } else if (buttonIndex === 1) {
            try {
              await deleteMessage(item.id, meUserRef.current || meRef.current);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {}
          }
        }
      );
    } else {
              Alert.alert('Message', 'Choose an action', [
        {
          text: 'Delete (local)',
          onPress: () => setItems((prev) => prev.filter((i) => i.id !== item.id)),
        },
        {
          text: 'Delete for everyone',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(item.id, meUserRef.current || meRef.current);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {}
          },
        },
                { text: 'Cancel', style: 'cancel' },
              ]);
    }
  };

  const handleAttachmentPress = async (item: ChatItem) => {
    if (!item.attachment) return;
    try {
      const key = convoKeyRef.current;
      if (!key) return;
      
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isDecrypting: true } : i
        )
      );
      
      const result = await downloadAndDecryptAttachment(
        item.attachment.id,
        item.attachment.nonce,
        key
      );
      
      const mime = item.attachment.mime || result.mime || 'application/octet-stream';
      
      if (mime.startsWith('image/')) {
        setPreviewImage(`data:${mime};base64,${result.base64}`);
      } else if (mime.startsWith('audio/')) {
        // For audio, create a blob URL and play it
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Audio) {
          try {
            const buffer = result.bytes.buffer instanceof ArrayBuffer 
              ? result.bytes.buffer 
              : new Uint8Array(result.bytes).buffer;
            const audioBlob = new Blob([buffer], { type: mime });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            // Set up event handlers before playing
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = (e) => {
              console.error('Audio playback error:', e);
              URL.revokeObjectURL(audioUrl);
              Alert.alert('Audio', 'Failed to play audio file');
            };
            
            // Play the audio
            audio.play().catch((e) => {
              console.error('Failed to play audio:', e);
              URL.revokeObjectURL(audioUrl);
              Alert.alert('Audio', 'Failed to play audio. The file may be corrupted or in an unsupported format.');
            });
          } catch (e) {
            console.error('Error creating audio player:', e);
            Alert.alert('Audio', 'Failed to create audio player: ' + (e instanceof Error ? e.message : 'Unknown error'));
          }
        } else {
          Alert.alert('Audio', 'Audio playback is only supported on web');
        }
      } else {
        // For other files, offer download
        const buffer = result.bytes.buffer instanceof ArrayBuffer 
          ? result.bytes.buffer 
          : new Uint8Array(result.bytes).buffer;
        const blob = new Blob([buffer], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.attachment.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isDecrypting: false } : i
        )
      );
    } catch (e) {
      Alert.alert('Attachment', 'Failed to download/decrypt: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isDecrypting: false } : i))
      );
    }
  };

  const handleLongPressSend = () => {
    Alert.alert(
      'Send with expiry?',
      'Choose when this message should disappear',
      [
        { text: '10 seconds', onPress: () => setSelfDestructSec(10) },
        { text: '1 minute', onPress: () => setSelfDestructSec(60) },
        { text: '5 minutes', onPress: () => setSelfDestructSec(300) },
        { text: '1 hour', onPress: () => setSelfDestructSec(3600) },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelfDestructSec(null),
        },
      ]
    );
  };

  const handleVoiceRecord = async (uri: string) => {
    try {
      // Convert blob URI to file for attachment
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Use the existing attachment flow
      const key = convoKeyRef.current;
      if (!key) return;
      
      // For web, we need to convert blob to base64 and create a file URI
      // Read blob as base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Create a temporary file URI (for web compatibility)
      const mimeType = blob.type || 'audio/webm';
      const fileName = `recording.${mimeType.split('/')[1] || 'webm'}`;
      
      // Convert to PickedAttachment format
      const att = {
        name: fileName,
        size: blob.size,
        mime: mimeType,
        uri: `data:${mimeType};base64,${base64}`, // Use data URI for web
      };
      
      const enc = await encryptAndUploadAttachment(att, key);
      const me = await getStoredKeypair();
      if (!me) return;
      if (!meUserRef.current) {
        const username = await getUsername();
        if (!username) {
          Alert.alert('Error', 'Username not found. Please restart the app.');
          return;
        }
        meUserRef.current = username;
      }
      const payload = {
        from: meUserRef.current.trim().toLowerCase(),
        to: peerUsername.trim().toLowerCase(),
        ciphertext: '',
        nonce: enc.nonce,
        fingerprint: fingerprintPublicKey(me.publicKey),
        timestamp: Date.now(),
        attachmentId: enc.id,
        mime: enc.mime || null,
        name: enc.name || 'Voice message',
      };
      const tempId = Math.random().toString(36);
      setSendingMessageId(tempId);
      const newAttachmentMessage: ChatItem = {
        id: tempId,
        fromMe: true,
        text: 'Voice message',
        timestamp: payload.timestamp,
        attachment: {
          id: enc.id,
          nonce: enc.nonce,
          name: enc.name,
          mime: enc.mime,
        },
        status: 'sending',
      };
      setItems((prev) => [...prev, newAttachmentMessage].sort((a, b) => a.timestamp - b.timestamp));
      try {
        const resp = await sendMessage(payload);
        const msgId = resp?.id || tempId;
        setSendingMessageId(null);
        setItems((prev) => {
          const updated = prev
            .map((item) =>
              item.id === tempId ? { ...item, id: msgId, status: 'sent' as const } : item
            )
            .sort((a, b) => a.timestamp - b.timestamp);
          return updated;
        });
        
        // Update since timestamp to trigger immediate poll
        sinceRef.current = payload.timestamp;
        setSince(payload.timestamp);
        
        // Scroll to bottom after sending voice message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } catch (e) {
        setSendingMessageId(null);
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        console.error('Send voice error:', e);
        Alert.alert('Error', 'Failed to send voice message: ' + (e instanceof Error ? e.message : 'Unknown error'));
      }
    } catch (e) {
      console.error('Voice recording error:', e);
      Alert.alert('Error', 'Failed to process voice recording: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* WhatsApp Web Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
        <View style={styles.headerContent}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          )}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {peerUsername[0]?.toUpperCase() || '?'}
            </Text>
      </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: theme.colors.textPrimary }]}>
              {peerUsername}
            </Text>
            <Text style={[styles.headerSubtext, { color: theme.colors.textSecondary }]}>
              End-to-end encrypted
            </Text>
            </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Text style={styles.headerIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowFingerprintModal(true)}
            >
              <Text style={styles.headerIcon}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        data={useMemo(() => [...items].sort((a, b) => a.timestamp - b.timestamp), [items])}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble
            text={item.text}
            isFromMe={item.fromMe}
            timestamp={item.timestamp}
            status={item.status}
            attachment={
              item.attachment
                ? {
                    name: item.attachment.name,
                    mime: item.attachment.mime,
                    isDecrypting: item.isDecrypting,
                    id: item.attachment.id,
                    nonce: item.attachment.nonce,
                  }
                : null
            }
            onLongPress={() => handleMessageLongPress(item)}
            onPress={() => handleAttachmentPress(item)}
            onDecryptAttachment={async (id: string, nonce: string) => {
              try {
                const key = convoKeyRef.current;
                if (!key) return null;
                const result = await downloadAndDecryptAttachment(id, nonce, key);
                const mime = item.attachment?.mime || result.mime || 'image/*';
                return `data:${mime};base64,${result.base64}`;
              } catch (e) {
                console.error('Failed to decrypt attachment:', e);
                return null;
              }
            }}
            showEncryptionShimmer={item.fromMe && item.status === 'sending'}
          />
        )}
        contentContainerStyle={styles.messagesContent}
        inverted={false}
        // Removed onContentSizeChange auto-scroll to prevent unwanted scrolling
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoadingPeer ? (
              <>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Loading...
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  Setting up secure connection
                </Text>
              </>
            ) : peerNotFound ? (
              <>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  User not found
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  {peerUsername} is not registered on the server
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary, marginTop: 8, fontSize: 12 }]}>
                  Make sure the server is running and the user has registered. Check server console for available users.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No messages yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  Start the conversation
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* Draft Attachment Preview */}
      {draftAttachment && (
        <View style={[styles.draftContainer, { backgroundColor: theme.colors.header }]}>
          <Image source={{ uri: draftAttachment.uri }} style={styles.draftImage} resizeMode="cover" />
          <View style={styles.draftActions}>
            <TouchableOpacity
              onPress={handleCancelDraft}
              style={[styles.draftButton, { backgroundColor: theme.colors.border }]}
            >
              <Text style={[styles.draftButtonText, { color: theme.colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendDraft}
              style={[styles.draftButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.draftButtonText, { color: theme.colors.textInverse }]}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Composer - Only show if peer is found and loaded */}
      {!peerNotFound && !isLoadingPeer && (
        <Composer
          value={input}
          onChangeText={setInput}
          onSend={onSend}
          onAttach={onAttach}
          onEmojiPress={() => setShowEmojiPicker(true)}
          onLongPressSend={handleLongPressSend}
          onVoiceRecord={handleVoiceRecord}
          placeholder="Type a message..."
        />
      )}

      {/* Emoji Picker */}
      <EmojiPicker
        visible={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={[styles.imageModal, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            onPress={() => setPreviewImage(null)}
            style={[styles.closeButton, { backgroundColor: theme.colors.backgroundCard }]}
          >
            <Text style={[styles.closeButtonText, { color: theme.colors.textPrimary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <KeyFingerprintModal
        visible={showFingerprintModal}
        fingerprint={peerFingerprint}
        peerUsername={peerUsername}
        onClose={() => setShowFingerprintModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDEF',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#54656F',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DFE5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#54656F',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '400',
  },
  headerSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
    color: '#54656F',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 15,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  imageModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '90%',
    height: '70%',
  },
  closeButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  draftContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9EDEF',
  },
  draftImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'center',
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  draftButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
