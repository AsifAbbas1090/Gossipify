# Architecture & Security

## Encryption Flow

### Key Generation
1. User generates X25519 keypair (once during registration)
2. Private key encrypted with user password using Argon2id
3. Encrypted private key stored in IndexedDB
4. Public key stored in Supabase `profiles` table

### Message Encryption
1. **Sender side:**
   - Derive shared key: `crypto_box_beforenm(peer_public_key, my_private_key)`
   - Encrypt message: `crypto_secretbox_easy(plaintext, nonce, shared_key)`
   - Send ciphertext + nonce to Supabase

2. **Receiver side:**
   - Derive same shared key: `crypto_box_beforenm(sender_public_key, my_private_key)`
   - Decrypt: `crypto_secretbox_open_easy(ciphertext, nonce, shared_key)`

### Media Encryption
1. **Upload:**
   - Encrypt file client-side using shared key
   - Upload encrypted blob to Supabase Storage
   - Store metadata (path, nonce, mime) in messages table

2. **Download:**
   - Fetch metadata from messages table
   - Download encrypted blob from Storage
   - Decrypt client-side using shared key

## Database Schema

### Tables
- `profiles`: User profiles with public keys
- `messages`: Encrypted messages (ciphertext, nonce, metadata)
- `contacts`: Known contacts (removes "Unknown" tag)
- `blocked_users`: Blocked user pairs

### Row Level Security (RLS)
- Users can only see messages they sent/received
- Users cannot send messages to blocked users
- Storage access restricted to authenticated users

## Security Guarantees

1. **End-to-End Encryption**
   - Server never sees plaintext messages
   - Only encrypted blobs stored in database
   - Decryption happens client-side only

2. **Key Management**
   - Private keys encrypted with user password
   - Keys stored locally in IndexedDB
   - Lost keys = cannot decrypt old messages (by design)

3. **Access Control**
   - RLS policies enforce message visibility
   - Block feature prevents unwanted messages
   - Storage bucket is private

## File Structure

```
src/
├── lib/
│   ├── crypto.ts          # libsodium encryption primitives
│   ├── storage.ts          # IndexedDB key storage
│   ├── supabase.ts         # Supabase client
│   ├── messages.ts         # Message CRUD operations
│   ├── media.ts            # Media upload/download
│   ├── contacts.ts         # Contact management
│   ├── blocked.ts          # Block/unblock
│   ├── profiles.ts         # Profile operations
│   └── chats.ts            # Chat list logic
├── components/
│   ├── AppShell.tsx        # 30/70 layout
│   ├── ChatList.tsx        # Chat list with Unknown tags
│   ├── ChatView.tsx        # Message view
│   ├── MessageBubble.tsx   # Individual message
│   ├── Composer.tsx        # Input with emoji/media
│   └── Settings.tsx        # Key management
└── styles/
    └── index.css           # Tailwind + responsive CSS
```

## Responsive Layout

- **Desktop (>768px):** 30% chat list, 70% chat view side-by-side
- **Mobile (<768px):** Full screen chat list or chat view (toggle)

## Testing Strategy

1. **Unit Tests:** Encryption/decryption roundtrips
2. **Integration Tests:** Upload/download encrypted files
3. **E2E Tests:** Unknown tag, blocking, message flow

## Deployment

1. Build: `npm run build`
2. Deploy `dist/` to static hosting (Vercel, Netlify, etc.)
3. Ensure environment variables are set
4. Supabase handles backend automatically

