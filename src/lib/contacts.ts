/**
 * Contact management
 * Updated to use chat_members.is_unknown instead of separate contacts table
 */

import { supabase } from './supabase';

/**
 * Mark user as known (remove "Unknown" tag) in a chat
 */
export async function markAsKnown(chatId: string, userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Update is_unknown to false for this user in this chat
  const { error } = await supabase
    .from('chat_members')
    .update({ is_unknown: false })
    .eq('chat_id', chatId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to mark as known: ${error.message}`);
  }
}

/**
 * Get all chats where user is a member (contacts are chats where is_unknown = false)
 */
export async function getKnownContacts(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get all chat members where user is member and other member is not unknown
  const { data: chats, error } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', user.id);
  
  if (error || !chats) {
    return [];
  }
  
  const chatIds = chats.map(c => c.chat_id);
  
  // Get other members in these chats who are not unknown
  const { data: members } = await supabase
    .from('chat_members')
    .select('user_id')
    .in('chat_id', chatIds)
    .eq('is_unknown', false)
    .neq('user_id', user.id);
  
  return members?.map(m => m.user_id) || [];
}

/**
 * Check if user is known (not unknown) in any chat
 */
export async function isKnown(userId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  // Check if there's a chat where both users are members and userId is not unknown
  const { data: myChats } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', user.id);
  
  if (!myChats || myChats.length === 0) {
    return false;
  }
  
  const chatIds = myChats.map(c => c.chat_id);
  
  const { data: otherMember } = await supabase
    .from('chat_members')
    .select('is_unknown')
    .in('chat_id', chatIds)
    .eq('user_id', userId)
    .eq('is_unknown', false)
    .limit(1)
    .single();
  
  return !!otherMember;
}

