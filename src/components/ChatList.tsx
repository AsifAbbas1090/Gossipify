/**
 * Chat list component - WhatsApp Web style
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getChatList, ChatPreview } from '../lib/chats';

interface ChatListProps {
  onSelectChat: (peerId: string, chatId: string) => void;
  selectedChat: string | null;
}

export default function ChatList({ onSelectChat, selectedChat }: ChatListProps) {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadChats = async () => {
    try {
      const chatList = await getChatList();
      setChats(chatList);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-[#667781]">Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - WhatsApp style */}
      <div className="h-[60px] px-4 py-3 bg-[#F0F2F5] flex items-center justify-between border-b border-[#E9EDEF]">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-[#DFE5E7] flex items-center justify-center cursor-pointer hover:bg-[#D1D7D9] transition-colors">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#54656F">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#667781">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border-none outline-none text-sm text-[#111B21] placeholder-[#667781]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-10 h-10 rounded-full bg-[#DFE5E7] flex items-center justify-center cursor-pointer hover:bg-[#D1D7D9] transition-colors">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#54656F">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        {chats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-[#667781]">No chats yet</p>
              <p className="text-sm text-[#667781] mt-2">
                Start a new conversation
              </p>
            </div>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.chatId}
              onClick={() => onSelectChat(chat.peerId, chat.chatId)}
              className={`h-[72px] px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[#F5F6F6] transition-colors border-b border-[#E9EDEF] ${
                selectedChat === chat.peerId || selectedChat === chat.chatId ? 'bg-[#F0F2F5]' : 'bg-white'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-[49px] h-[49px] rounded-full bg-[#DFE5E7] flex items-center justify-center text-[#54656F] font-semibold text-lg">
                  {chat.peerUsername[0]?.toUpperCase() || '?'}
                </div>
                {chat.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-white">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`text-base truncate ${
                    chat.unreadCount > 0 
                      ? 'text-[#111B21] font-semibold' 
                      : 'text-[#111B21] font-normal'
                  }`}>
                    {chat.peerUsername}
                  </h3>
                  {chat.lastMessageTime && (
                    <span className={`text-xs whitespace-nowrap ml-2 ${
                      chat.unreadCount > 0 
                        ? 'text-[#25D366] font-medium' 
                        : 'text-[#667781]'
                    }`}>
                      {format(new Date(chat.lastMessageTime), 'HH:mm')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {chat.isUnknown && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800 rounded-full flex-shrink-0">
                      Unknown
                    </span>
                  )}
                  <p className={`text-sm truncate flex-1 ${
                    chat.unreadCount > 0 
                      ? 'text-[#111B21] font-medium' 
                      : 'text-[#667781]'
                  }`}>
                    {chat.lastMessage || 'No messages'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
