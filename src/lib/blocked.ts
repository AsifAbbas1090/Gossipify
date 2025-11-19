/**
 * Block/unblock users
 * Updated to use new schema with 'blocker' and 'blocked' columns
 */

import { supabase, BlockedUser } from './supabase';

/**
 * Block a user
 */
export async function blockUser(userId: string): Promise<BlockedUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('blocked_users')
    .insert({
      blocker: user.id,
      blocked: userId,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to block user: ${error.message}`);
  }
  
  return data;
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker', user.id)
    .eq('blocked', userId);
  
  if (error) {
    throw new Error(`Failed to unblock user: ${error.message}`);
  }
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('blocked_users')
    .select('*')
    .eq('blocker', user.id);
  
  if (error) {
    throw new Error(`Failed to fetch blocked users: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Check if user is blocked (either direction)
 */
export async function isBlocked(userId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  // Check if either user blocked the other
  const { data } = await supabase
    .from('blocked_users')
    .select('blocker')
    .or(`and(blocker.eq.${user.id},blocked.eq.${userId}),and(blocker.eq.${userId},blocked.eq.${user.id})`)
    .limit(1)
    .single();
  
  return !!data;
}

