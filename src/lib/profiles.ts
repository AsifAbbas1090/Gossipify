/**
 * User profile management
 * Updated to use 'users' table instead of 'profiles'
 */

import { supabase, User } from './supabase';

/**
 * Get user profile
 */
export async function getProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
  
  return data;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  return getProfile(user.id);
}

/**
 * Create or update user profile
 */
export async function upsertProfile(
  username: string,
  publicKey: string,
  displayName?: string
): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      username,
      public_key: publicKey,
      display_name: displayName || username,
    }, {
      onConflict: 'id',
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }
  
  return data;
}

/**
 * Update profile (username, display name, avatar)
 */
export async function updateProfile(
  username?: string,
  displayName?: string,
  avatarUrl?: string
): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const updates: Partial<User> = {};
  if (username) updates.username = username;
  if (displayName) updates.display_name = displayName;
  if (avatarUrl) updates.avatar_url = avatarUrl;
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
  
  return data;
}

/**
 * Search users by username
 */
export async function searchUsers(query: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(20);
  
  if (error) {
    throw new Error(`Failed to search users: ${error.message}`);
  }
  
  return data || [];
}

