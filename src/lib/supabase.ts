/**
 * Supabase client setup
 * Only uses anon key - service_role key should NEVER be exposed to client
 */

import { createClient } from '@supabase/supabase-js';

// Use provided Supabase credentials
const supabaseUrl = 'https://vpgfwmuyyhsyfgtwkgii.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZ2Z3bXV5eWhzeWZndHdrZ2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjMwNDksImV4cCI6MjA3ODg5OTA0OX0.olW9daoszLlKKZfTXZNL3PGm7Nb-8n9iQDx4dTsQcGE';

// Fallback to env vars if needed (for local development override)
const finalUrl = import.meta.env.VITE_SUPABASE_URL || supabaseUrl;
const finalKey = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseKey;

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types matching the provided schema
export interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  public_key: string;
  created_at: string;
}

export interface Chat {
  id: string;
  is_group: boolean;
  created_at: string;
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  display_name?: string;
  is_unknown: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  ciphertext: string | Uint8Array; // bytea in DB, Supabase may return as base64 string or Uint8Array
  nonce: string | Uint8Array; // bytea in DB
  kind: 'text' | 'image' | 'audio' | 'file';
  media_path?: string;
  media_mime?: string;
  created_at: string;
  delivered: boolean;
}

export interface BlockedUser {
  blocker: string;
  blocked: string;
  created_at: string;
}

