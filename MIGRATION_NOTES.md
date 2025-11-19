# Migration Notes - Updated to Your Supabase Schema

## Changes Made

### 1. Database Schema
- ✅ Updated to use `users` table (not `profiles`)
- ✅ Added `chats` and `chat_members` tables
- ✅ Updated `messages` table to use `bytea` for ciphertext/nonce
- ✅ Updated `blocked_users` to use `blocker`/`blocked` columns

### 2. Supabase Client
- ✅ Hardcoded your Supabase URL and anon key
- ✅ Updated TypeScript interfaces to match new schema

### 3. Storage
- ✅ Changed bucket name to `end-to-end app`
- ✅ Updated file paths to use `chat_<chatId>/` format

### 4. Chat Management
- ✅ Implemented chat creation via `chats` and `chat_members` tables
- ✅ "Unknown" tag now uses `chat_members.is_unknown` flag
- ✅ Chat list fetches from `chat_members` instead of direct message queries

### 5. Bytea Handling
- ⚠️ **Important**: Supabase PostgREST may return bytea as base64 strings or Uint8Array
- Code handles both cases
- If you encounter issues, you may need to:
  1. Create a PostgreSQL function to handle bytea conversion
  2. Or change schema to use TEXT instead of BYTEA (see `SUPABASE_BYTEA_FIX.md`)

## Testing Checklist

- [ ] Sign in with Supabase auth
- [ ] Generate keypair and store in `users` table
- [ ] Create a chat (should happen automatically on first message)
- [ ] Send text message (check bytea storage works)
- [ ] Send image/audio (check storage upload works)
- [ ] Receive message (check bytea reading works)
- [ ] Test "Unknown" tag (first message from new user)
- [ ] Test blocking (should prevent message creation)
- [ ] Test chat list (should show all chats user is member of)

## Known Issues & Solutions

### Bytea Format
If Supabase rejects bytea inserts, you have two options:

**Option 1: Use PostgreSQL Function**
```sql
CREATE OR REPLACE FUNCTION insert_message(
  p_chat_id uuid,
  p_sender_id uuid,
  p_ciphertext text, -- base64 string
  p_nonce text, -- base64 string
  p_kind text
) RETURNS uuid AS $$
DECLARE
  msg_id uuid;
BEGIN
  INSERT INTO messages (chat_id, sender_id, ciphertext, nonce, kind)
  VALUES (
    p_chat_id,
    p_sender_id,
    decode(p_ciphertext, 'base64'), -- Convert base64 to bytea
    decode(p_nonce, 'base64'),
    p_kind
  )
  RETURNING id INTO msg_id;
  RETURN msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Option 2: Change to TEXT**
```sql
ALTER TABLE messages 
  ALTER COLUMN ciphertext TYPE TEXT,
  ALTER COLUMN nonce TYPE TEXT;
```
Then store base64 strings directly (simpler but less efficient).

## Next Steps

1. Test the app with your Supabase database
2. If bytea causes issues, implement one of the solutions above
3. Verify RLS policies are working correctly
4. Test storage bucket access

