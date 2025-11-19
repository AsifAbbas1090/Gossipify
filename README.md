# Gossipify - End-to-End Encrypted Chat

A WhatsApp-like encrypted chat application built with React, TypeScript, Supabase, and libsodium.

## Features

- 🔐 End-to-end encryption using libsodium (X25519 + XSalsa20-Poly1305)
- 💬 Real-time messaging with Supabase
- 📷 Image and audio support
- 😊 Emoji picker
- 🚫 Block users
- 🏷️ "Unknown" tag for first-time senders
- 📱 Responsive design (30% chat list, 70% chat view on desktop)
- 🔑 Secure key storage with password encryption

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a Supabase project at https://supabase.com
2. Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor
3. Create a storage bucket named `encrypted-media` (see `SUPABASE_SETUP.md`)
4. Copy `.env.example` to `.env.local` and fill in your Supabase credentials

### 3. Run Development Server

```bash
npm run dev
```

## Security Notes

- **Private keys are encrypted** with user password before storage in IndexedDB
- **All messages are encrypted client-side** before sending to Supabase
- **Media files are encrypted** before upload to Supabase Storage
- **Server never sees plaintext** - only encrypted blobs and metadata
- **If you lose your private key**, you cannot decrypt old messages (by design)

## Testing

### Unit Tests

```bash
npm test
```

### Manual Testing Checklist

- [ ] Generate keypair and store encrypted
- [ ] Send text message
- [ ] Send image
- [ ] Send audio
- [ ] Receive message from unknown sender (should show "Unknown" tag)
- [ ] Add contact (should remove "Unknown" tag)
- [ ] Block user (should prevent messaging)
- [ ] Export/import keys

## Project Structure

```
src/
├── lib/
│   ├── crypto.ts          # Encryption utilities (libsodium)
│   ├── storage.ts          # Secure key storage (IndexedDB)
│   ├── supabase.ts         # Supabase client
│   ├── messages.ts         # Message operations
│   ├── media.ts            # Media upload/download
│   ├── contacts.ts         # Contact management
│   ├── blocked.ts          # Block/unblock users
│   ├── profiles.ts         # Profile operations
│   └── chats.ts            # Chat list operations
├── components/
│   ├── AppShell.tsx        # Main layout
│   ├── ChatList.tsx        # Chat list with "Unknown" tags
│   ├── ChatView.tsx        # Message view
│   ├── MessageBubble.tsx   # Individual message
│   ├── Composer.tsx        # Message input with emoji/media
│   └── Settings.tsx        # Settings panel
├── styles/
│   └── index.css           # Tailwind styles
└── App.tsx                 # Root component
```

## Environment Variables

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## License

MIT
