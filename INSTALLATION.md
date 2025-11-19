# Installation & Setup Guide

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)

## Step 1: Clone and Install

```bash
npm install
```

## Step 2: Set Up Supabase

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Wait for database to initialize

2. **Run SQL Schema**
   - Open Supabase Dashboard → SQL Editor
   - Copy and paste contents of `supabase/schema.sql`
   - Click "Run"

3. **Create Storage Bucket**
   - Go to Storage in Supabase Dashboard
   - Create new bucket named `encrypted-media`
   - Set to **Private** (not public)
   - Copy the storage policies from `SUPABASE_SETUP.md` and run in SQL Editor

4. **Get API Keys**
   - Go to Settings → API
   - Copy your Project URL and anon/public key
   - **DO NOT** copy service_role key to client

## Step 3: Configure Environment

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

## Step 5: First-Time Setup

1. **Sign In**
   - Enter your email
   - Check email for magic link
   - Click link to sign in

2. **Generate Keys**
   - Go to Settings
   - Click "Generate Keys"
   - Enter a strong password (you'll need this to decrypt messages)
   - **Save your password securely** - you cannot recover it!

3. **Set Username**
   - Enter a username in Settings
   - Click "Update Profile"

## Testing

### Test Encryption
- Send a message to yourself or another user
- Check Supabase dashboard → messages table
- Verify ciphertext is encrypted (not plaintext)

### Test "Unknown" Tag
- User A sends message to User B (first time)
- User B should see "Unknown" badge in chat list
- User B adds User A as contact
- "Unknown" badge should disappear

### Test Blocking
- User A blocks User B
- User B cannot send messages to User A
- User A doesn't see messages from User B

## Troubleshooting

### "Failed to decrypt message"
- Check that both users have generated keypairs
- Verify public keys are stored in profiles table
- Ensure you're using the correct password for private key

### "Storage upload failed"
- Verify storage bucket `encrypted-media` exists
- Check storage policies are set correctly
- Ensure bucket is private (not public)

### "RLS policy violation"
- Check that RLS policies in schema.sql were run
- Verify user is authenticated
- Check Supabase logs for specific error

## Security Checklist

- ✅ Private keys encrypted with password
- ✅ All messages encrypted client-side
- ✅ Media files encrypted before upload
- ✅ Server never sees plaintext
- ✅ RLS policies prevent unauthorized access
- ✅ Block feature prevents unwanted messages

