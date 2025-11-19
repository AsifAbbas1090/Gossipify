/**
 * Chat list operations
 * Updated to use new schema: chats, chat_members with is_unknown flag
 */

import { supabase, Chat, ChatMember, User } from './supabase';
import { getKnownContacts } from './contacts';

export interface ChatPreview {
  chatId: string;
  peerId: string;
  peerUsername: string;
  peerPublicKey: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isUnknown: boolean; // True if peer is marked as unknown in chat_members
}

/**
 * Get chat list with previews
 */
export async function getChatList(): Promise<ChatPreview[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get all chats where user is a member
  const { data: myChatMembers, error: membersError } = await supabase
    .from('chat_members')
    .select('chat_id, is_unknown')
    .eq('user_id', user.id);
  
  if (membersError || !myChatMembers) {
    throw new Error(`Failed to fetch chats: ${membersError?.message}`);
  }
  
  const chatIds = myChatMembers.map(m => m.chat_id);
  
  if (chatIds.length === 0) {
    return [];
  }
  
  // Get all messages for these chats
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });
  
  if (messagesError) {
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }
  
  // Get all chat members for these chats
  const { data: allMembers, error: allMembersError } = await supabase
    .from('chat_members')
    .select('*')
    .in('chat_id', chatIds);
  
  if (allMembersError) {
    throw new Error(`Failed to fetch members: ${allMembersError.message}`);
  }
  
  // Build chat previews
  const chatMap = new Map<string, ChatPreview>();
  
  for (const chatId of chatIds) {
    // Find the other member (peer) in this chat
    const otherMember = allMembers?.find(
      m => m.chat_id === chatId && m.user_id !== user.id
    );
    
    if (!otherMember) continue;
    
    // Get peer profile
    const { data: peerProfile } = await supabase
      .from('users')
      .select('username, public_key')
      .eq('id', otherMember.user_id)
      .single();
    
    if (!peerProfile) continue;
    
    // Get last message for this chat
    const lastMessage = messages?.find(m => m.chat_id === chatId);
    
    // Count unread (messages not delivered to user)
    const unreadCount = messages?.filter(
      m => m.chat_id === chatId && 
           m.sender_id !== user.id && 
           !m.delivered
    ).length || 0;
    
    chatMap.set(chatId, {
      chatId,
      peerId: otherMember.user_id,
      peerUsername: peerProfile.username,
      peerPublicKey: peerProfile.public_key,
      isUnknown: otherMember.is_unknown || false,
      lastMessage: lastMessage 
        ? (lastMessage.media_path ? '📎 Media' : '🔒 Encrypted')
        : undefined,
      lastMessageTime: lastMessage?.created_at,
      unreadCount,
    });
  }
  
  return Array.from(chatMap.values()).sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Get or create chat ID for a 1:1 conversation
 * Also handles "unknown" flag when first message received
 */
export async function getOrCreateChatWithPeer(
  peerId: string,
  isFirstMessageFromPeer: boolean = false
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Check if chat already exists
  const { data: myChats } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', user.id);
  
  if (myChats) {
    for (const member of myChats) {
      const { data: otherMember } = await supabase
        .from('chat_members')
        .select('chat_id, is_unknown')
        .eq('chat_id', member.chat_id)
        .eq('user_id', peerId)
        .single();
      
      if (otherMember) {
        // If this is first message from peer, mark as unknown
        if (isFirstMessageFromPeer && !otherMember.is_unknown) {
          await supabase
            .from('chat_members')
            .update({ is_unknown: true })
            .eq('chat_id', member.chat_id)
            .eq('user_id', peerId);
        }
        return member.chat_id;
      }
    }
  }
  
  // Create new chat
  const { data: newChat, error: chatError } = await supabase
    .from('chats')
    .insert({ is_group: false })
    .select()
    .single();
  
  if (chatError || !newChat) {
    throw new Error(`Failed to create chat: ${chatError?.message}`);
  }
  
  // Add both users as members
  // Mark peer as unknown if this is first message from them
  await supabase.from('chat_members').insert([
    { chat_id: newChat.id, user_id: user.id, is_unknown: false },
    { chat_id: newChat.id, user_id: peerId, is_unknown: isFirstMessageFromPeer },
  ]);
  
  return newChat.id;
}
