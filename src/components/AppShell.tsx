/**
 * Main app shell with WhatsApp Web layout
 * 30% chat list, 70% chat view on desktop
 */

import { useState } from 'react';
import ChatList from './ChatList';
import ChatView from './ChatView';

export default function AppShell() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showChatView, setShowChatView] = useState(false);

  const handleSelectChat = (peerId: string, chatId: string) => {
    setSelectedChat(peerId);
    setSelectedChatId(chatId);
    setShowChatView(true);
  };

  const handleBack = () => {
    setShowChatView(false);
    setSelectedChat(null);
    setSelectedChatId(null);
  };

  return (
    <div className="app-shell">
      <div
        className={`chat-list-container ${
          showChatView ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ChatList 
          onSelectChat={handleSelectChat} 
          selectedChat={selectedChatId || selectedChat} 
        />
      </div>
      <div
        className={`chat-view-container ${
          showChatView ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedChat ? (
          <ChatView peerId={selectedChat} onBack={handleBack} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-8">
              <div className="mb-6">
                <svg
                  viewBox="0 0 192 192"
                  className="w-48 h-48 mx-auto opacity-20"
                  fill="currentColor"
                >
                  <path d="M96 0C43.008 0 0 43.008 0 96c0 16.896 4.608 32.736 12.576 46.368L0 192l50.688-12.192C63.744 187.68 79.488 192 96 192c52.992 0 96-43.008 96-96S148.992 0 96 0zm0 176c-14.784 0-28.704-3.936-40.8-10.848l-2.88-1.728-30.048 7.2 7.296-29.376-1.824-2.976C20.64 130.848 16 113.76 16 96c0-44.112 35.888-80 80-80s80 35.888 80 80-35.888 80-80 80z" fill="#667781"/>
                </svg>
              </div>
              <h2 className="text-3xl font-light text-[#667781] mb-2">
                Keep your phone connected
              </h2>
              <p className="text-sm text-[#667781] leading-relaxed">
                WhatsApp connects to your phone to sync messages. To reduce data usage, connect your phone to Wi-Fi.
              </p>
              <div className="mt-6 pt-6 border-t border-[#E9EDEF]">
                <p className="text-xs text-[#667781]">
                  Your messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
