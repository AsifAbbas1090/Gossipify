/**
 * Chat view component - WhatsApp Web style
 */

import { useEffect, useState, useRef } from 'react';
import { MessageWithDecrypted, fetchMessages, sendTextMessage, sendMediaMessage, markMessageAsDelivered } from '../lib/messages';
import { getProfile } from '../lib/profiles';
import { getEncryptedKey } from '../lib/storage';
import { decryptPrivateKey } from '../lib/crypto';
import Composer from './Composer';
import MessageBubble from './MessageBubble';

interface ChatViewProps {
  peerId: string;
  onBack: () => void;
}

export default function ChatView({ peerId, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<MessageWithDecrypted[]>([]);
  const [peerProfile, setPeerProfile] = useState<any>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPrivateKey, setMyPrivateKey] = useState<string | null>(null);
  const [keyPrompted, setKeyPrompted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load private key on mount
  useEffect(() => {
    const loadPrivateKey = async () => {
      if (keyPrompted) return;
      setKeyPrompted(true);
      
      const stored = await getEncryptedKey();
      if (stored) {
        const password = prompt('Enter password to decrypt your private key:');
        if (password) {
          const decrypted = await decryptPrivateKey(
            stored.encrypted,
            stored.salt,
            password
          );
          if (decrypted) {
            setMyPrivateKey(decrypted);
          } else {
            alert('Invalid password');
            setKeyPrompted(false);
          }
        } else {
          setKeyPrompted(false);
        }
      }
    };
    
    loadPrivateKey();
  }, [keyPrompted]);

  useEffect(() => {
    if (myPrivateKey && peerId) {
      loadChat();
      const interval = setInterval(loadChat, 2000);
      return () => clearInterval(interval);
    }
  }, [peerId, myPrivateKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChat = async () => {
    if (!myPrivateKey) return;
    
    try {
      const profile = await getProfile(peerId);
      if (!profile) {
        console.error('Peer profile not found');
        return;
      }
      setPeerProfile(profile);

      const { getOrCreateChatWithPeer } = await import('../lib/chats');
      const currentChatId = await getOrCreateChatWithPeer(peerId, false);
      setChatId(currentChatId);

      if (currentChatId) {
        const msgs = await fetchMessages(currentChatId, myPrivateKey, profile.public_key);
        setMessages(msgs);
        
        // Mark all received messages as delivered
        const { data: { user } } = await (await import('../lib/supabase')).supabase.auth.getUser();
        if (user) {
          for (const msg of msgs) {
            if (!msg.isFromMe && !msg.delivered) {
              await markMessageAsDelivered(msg.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendText = async (text: string) => {
    if (!myPrivateKey || !peerProfile) return;

    try {
      if (!chatId) {
        const { getOrCreateChatWithPeer } = await import('../lib/chats');
        const newChatId = await getOrCreateChatWithPeer(peerId, false);
        setChatId(newChatId);
      }
      
      await sendTextMessage(peerId, text, myPrivateKey, peerProfile.public_key);
      await loadChat();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSendMedia = async (file: File) => {
    if (!myPrivateKey || !peerProfile) return;

    try {
      if (!chatId) {
        const { getOrCreateChatWithPeer } = await import('../lib/chats');
        const newChatId = await getOrCreateChatWithPeer(peerId, false);
        setChatId(newChatId);
      }
      
      await sendMediaMessage(peerId, file, myPrivateKey, peerProfile.public_key);
      await loadChat();
    } catch (error) {
      console.error('Failed to send media:', error);
      alert('Failed to send media: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading || !myPrivateKey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#EFEAE2]">
        <p className="text-[#667781]">
          {!myPrivateKey ? 'Please enter your password to decrypt your private key' : 'Loading chat...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2]">
      {/* Header - WhatsApp style */}
      <div className="h-[60px] px-4 py-2 bg-[#F0F2F5] flex items-center justify-between border-b border-[#E9EDEF]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="md:hidden p-2 text-[#54656F] hover:bg-[#E9EDEF] rounded-full transition-colors"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-[#DFE5E7] flex items-center justify-center text-[#54656F] font-semibold flex-shrink-0">
            {peerProfile?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-normal text-[#111B21] truncate">
              {peerProfile?.username || 'Unknown'}
            </h2>
            <p className="text-xs text-[#667781]">
              End-to-end encrypted
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="wa-button" aria-label="Search">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
          <button className="wa-button" aria-label="More options">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-[#667781] mb-2">No messages yet</p>
              <p className="text-xs text-[#667781]">Start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <Composer
        onSendText={handleSendText}
        onSendMedia={handleSendMedia}
        disabled={!myPrivateKey}
      />
    </div>
  );
}
