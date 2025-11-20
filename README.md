# Gossipify - End-to-End Encrypted Chat Application

A secure, WhatsApp Web-style chat application built with React Native (Expo), TypeScript, and end-to-end encryption. Messages are encrypted client-side using X25519 key exchange and XSalsa20-Poly1305 encryption before being sent to the server. The server never sees plaintext messages.

## 🎯 Features

### Core Features
- 🔐 **End-to-End Encryption**: All messages encrypted client-side using X25519 key exchange and XSalsa20-Poly1305 (via TweetNaCl)
- 💬 **Real-time Messaging**: Polling-based message delivery with 800ms interval for near-instant updates
- 📷 **Image Support**: Send and receive encrypted images with automatic preview and decryption
- 📎 **File Attachments**: Send encrypted files of any type (images, documents, etc.)
- 🎤 **Voice Messages**: Record and send encrypted audio messages (web only - see limitations)
- 😊 **Emoji Picker**: Built-in emoji picker with categories for expressive messaging
- 🔑 **Key Management**: Secure key storage with Expo SecureStore (native) and localStorage (web)
- 📱 **Responsive Design**: WhatsApp Web-style layout (30% chat list, 70% chat view on desktop/tablet, full-screen on mobile)
- 🔒 **Security Indicators**: Visual fingerprint verification for peer identity verification
- ⏱️ **Self-Destructing Messages**: Optional message expiry (10s, 1min, 5min, 1hr)
- 📊 **Unread Counts**: Track unread messages per conversation (clears when chat is opened)
- 🎨 **Dark Mode Support**: Automatic theme switching based on system preferences
- 🔍 **Search**: Search for users to start new conversations
- 📝 **Message Status**: Visual indicators for sending/sent message status

### Security Features
- **Client-Side Encryption**: Messages encrypted before leaving device
- **Forward Secrecy**: Each conversation has unique shared key derived from keypair
- **Key Fingerprint Verification**: Verify peer identity to prevent MITM attacks
- **Secure Key Storage**: Native apps use encrypted keychain/keystore
- **No Server Access**: Server only stores encrypted blobs and metadata

## 🏗️ Architecture

### Client (`client/`)
- **Framework**: React Native (Expo SDK 52) with TypeScript
- **Navigation**: React Navigation (native-stack)
- **Encryption Library**: TweetNaCl (X25519 + XSalsa20-Poly1305)
- **Storage**: 
  - Native: Expo SecureStore (encrypted keychain/keystore)
  - Web: localStorage (consider password-based encryption for production)
- **UI Framework**: Custom WhatsApp Web-style components with React Native
- **Platform Support**: Web, iOS, Android (via Expo)

### Server (`server/`)
- **Framework**: Node.js + Express
- **Storage**: JSON file-based persistence (`users.json`, `messages.json`)
- **File Uploads**: Multer for handling encrypted attachments
- **API**: RESTful endpoints for registration, messaging, and file operations
- **Data Persistence**: All data persists across server restarts

## 📦 Technology Stack

### Client Stack
- **React Native** 0.76.0
- **Expo** 52.0.0
- **TypeScript** 5.6.3
- **React Navigation** 7.x
- **TweetNaCl** 1.0.3 (cryptography)
- **Expo SecureStore** (secure storage)
- **Expo File System** (file handling)
- **React Native Web** (web support)

### Server Stack
- **Node.js** 16+
- **Express** 4.19.2
- **TypeScript** 5.6.3
- **Multer** 1.4.5 (file uploads)
- **Nanoid** 5.0.7 (ID generation)
- **CORS** 2.8.5

## 🔐 Security Model

### Encryption Flow

1. **Key Generation**: Each user generates an X25519 keypair on first launch
   - Private key stored securely (never transmitted)
   - Public key registered with server (username → publicKey mapping)

2. **Key Exchange**: 
   - Public keys are fetched from server when starting a conversation
   - No direct key exchange - server acts as public key directory

3. **Shared Secret Derivation**: 
   - For each conversation, a shared secret is derived using X25519 key agreement
   - `sharedKey = X25519(myPrivateKey, peerPublicKey)`
   - Each conversation has a unique shared key

4. **Message Encryption**: 
   - Messages encrypted using XSalsa20-Poly1305 (AEAD) with the shared secret
   - Each message gets a unique nonce (random 24 bytes)
   - Ciphertext is base64-encoded before transmission

5. **Server Role**: 
   - Server only stores encrypted blobs and metadata
   - **Server never sees plaintext messages**
   - Server cannot decrypt messages even if compromised

### Key Storage

- **Native (iOS/Android)**: Expo SecureStore (encrypted keychain/keystore)
- **Web**: localStorage (consider adding password-based encryption for production)

### Security Guarantees

- ✅ Messages encrypted before leaving device
- ✅ Server cannot decrypt messages
- ✅ Forward secrecy: Each conversation has unique shared key
- ✅ Authentication: Fingerprint verification prevents MITM (when verified out-of-band)
- ⚠️ **Warning**: If you lose your private key, you cannot decrypt old messages
- ⚠️ **Warning**: Web storage (localStorage) is not encrypted - consider password protection for production

## 📋 Installation

### Prerequisites

- Node.js 16+ and npm
- For mobile development: Expo CLI (`npm install -g expo-cli`)

### Setup

1. **Clone the repository** (if not already done)

2. **Install client dependencies**:
```bash
cd client
npm install
```

3. **Install server dependencies**:
```bash
cd ../server
npm install
```

4. **Configure server URL** (if needed):
   - Edit `client/src/lib/config.ts` to set `SERVER_URL` (default: `http://localhost:4000`)

## 🚀 Running the Application

### Start the Server

Open a terminal and run:

```bash
cd server
npm run dev
```

The server will start on `http://localhost:4000` by default.

**📝 Note**: The server uses **persistent file-based storage** (JSON files):
- Users and messages are saved to `server/storage/users.json` and `server/storage/messages.json`
- Data persists across server restarts
- Users only need to register once

### Start the Client

Open a **new terminal** and run:

```bash
cd client
npm start
```

**Note**: For web development, you can also use:
```bash
cd client
npx expo start --web
```

### First Time Setup

1. **Start the server first** (required):
   ```bash
   cd server
   npm run dev
   ```
   The server will load existing users from `server/storage/users.json` on startup.

2. **Register users** (if not already registered):
   - Each user must register with a unique username
   - Usernames are case-insensitive (stored as lowercase)
   - Example: Register "alice", "bob", "charlie"
   - Users persist across server restarts (stored in JSON file)

3. **Start chatting**: Once users are registered, you can send messages between them

### Troubleshooting

**If users are not found:**
- Check server console - it shows all loaded users on startup
- Visit `http://localhost:4000/stats` to see registered users
- Make sure the server is running and has loaded users from `server/storage/users.json`
- Restart the server if you just registered a new user

## 📖 Usage

1. **First Launch**: 
   - Enter a username to register
   - Your encryption keypair is generated automatically and stored securely

2. **Start a Chat**:
   - Enter a peer's username in the search box
   - Click "Start" to begin chatting

3. **Send Messages**:
   - Type text and press Enter or click send
   - Click 📎 to attach files (images, audio, documents)
   - Click 😊 to open emoji picker
   - Click 🎤 to record voice message (web only)
   - Long-press send button to set message expiry

4. **View Attachments**:
   - Images: Click to view full-size in modal
   - Audio: Click to play (web only)
   - Files: Click to download

5. **Security**:
   - Click ⋮ in chat header to view peer's key fingerprint
   - Verify fingerprints out-of-band to ensure secure communication

## 📁 Project Structure

```
Gossipify/
├── client/                 # React Native (Expo) client
│   ├── src/
│   │   ├── screens/       # Screen components
│   │   │   ├── OnboardingScreen.tsx    # User registration
│   │   │   ├── HomeScreen.tsx           # Chat list
│   │   │   ├── ChatScreen.tsx           # Chat view
│   │   │   └── SettingsScreen.tsx       # Settings
│   │   ├── components/    # Reusable components
│   │   │   ├── WhatsAppLayout.tsx       # Main layout (30/70 split)
│   │   │   ├── ChatBubble.tsx           # Message bubble
│   │   │   ├── Composer.tsx             # Message input
│   │   │   ├── ConversationListItem.tsx # Chat list item
│   │   │   ├── EmojiPicker.tsx          # Emoji selector
│   │   │   └── KeyFingerprintModal.tsx   # Security modal
│   │   ├── lib/          # Core libraries
│   │   │   ├── crypto.ts          # Encryption utilities (X25519, XSalsa20-Poly1305)
│   │   │   ├── api.ts             # Server API client
│   │   │   ├── attachments.ts     # File handling (encrypt/decrypt)
│   │   │   ├── storage.ts         # Secure storage (SecureStore/localStorage)
│   │   │   └── config.ts          # Configuration (SERVER_URL)
│   │   └── theme.ts      # Theme configuration (light/dark)
│   ├── App.tsx           # Root component
│   └── package.json
├── server/               # Node.js backend
│   ├── src/
│   │   └── index.ts      # Express server
│   ├── storage/          # JSON file storage
│   │   ├── users.json    # User registry (username → publicKey)
│   │   ├── messages.json # Message storage (encrypted)
│   │   └── attachments/  # Encrypted file storage
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Server (`http://localhost:4000`)

#### Authentication & User Management

- **`POST /register`** - Register user with public key
  - Body: `{ username: string, publicKey: string }`
  - Returns: `{ ok: true }`
  - Usernames are normalized to lowercase

- **`GET /users/:username`** - Get user's public key
  - Returns: `{ username: string, publicKey: string }`
  - 404 if user not found

- **`GET /stats`** - Get server statistics (debugging)
  - Returns: `{ users: number, messages: number, activeUsers: string[] }`

#### Messaging

- **`POST /send`** - Send encrypted message
  - Body: `{ from: string, to: string, ciphertext: string, nonce: string, fingerprint: string, timestamp: number, attachmentId?: string, mime?: string, name?: string }`
  - Returns: `{ ok: true, id: string }`
  - Usernames normalized to lowercase

- **`GET /poll/:username?since=timestamp`** - Poll for new messages
  - Returns: `{ messages: StoredMessage[], deletions: { id: string, deletedAt: number }[] }`
  - Returns messages both TO and FROM the user
  - `since` parameter filters messages by timestamp

- **`POST /delete`** - Delete message (soft delete)
  - Body: `{ id: string, requester: string }`
  - Returns: `{ ok: true }`

#### File Attachments

- **`POST /upload`** - Upload encrypted attachment
  - Content-Type: `multipart/form-data`
  - Field: `blob` (file)
  - Returns: `{ id: string }`

- **`GET /download/:id`** - Download encrypted attachment
  - Returns: File blob
  - 404 if not found

## ⚠️ Known Limitations

### Audio System
- **⚠️ Audio recording and playback is web-only** - Not fully implemented for native platforms
- Web uses MediaRecorder API and HTML5 Audio for playback
- Native platforms (iOS/Android) require additional native modules for full audio support
- This is a known limitation and will be addressed in future updates

### Other Limitations
- Web storage (localStorage) is not encrypted - consider password protection for production
- No message delivery receipts (only sent status)
- No typing indicators
- No group chats (1-on-1 only)
- Polling-based (not WebSocket) - less efficient but simpler

## 🐛 Troubleshooting

### Messages appearing in wrong chats
- Ensure usernames are unique and consistent
- Check that server is running and accessible
- Clear browser cache/localStorage if issues persist
- Verify conversation ID matching is working (check console logs)

### Attachments not sending
- Check server is running on correct port
- Verify file size is reasonable (< 10MB recommended)
- Check browser console for errors
- Ensure FormData is being created correctly

### Audio not playing
- Audio playback is web-only (uses HTML5 Audio API)
- Ensure browser supports the audio format (WebM/MP4)
- Check browser console for playback errors
- Verify audio blob is created correctly

### Chat scrolling issues
- Fixed: Chat no longer scrolls from top to bottom when sending messages
- Initial load scrolls to bottom once (without animation)
- Only new messages (arrived after opening chat) trigger scroll

### Build Errors
- Run `npm install` in both `client/` and `server/` directories
- Clear node_modules and reinstall if needed
- Check Node.js version (16+ required)

## 🛠️ Development Commands

### Server
```bash
cd server
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Run production build
```

### Client
```bash
cd client
npm start        # Start Expo development server
npm run web      # Start web version
npm run android  # Run on Android
npm run ios      # Run on iOS
npm run typecheck # Type check without building
```

## 📝 License

MIT

## 🙏 Credits

Built with:
- React Native & Expo
- TweetNaCl for encryption
- React Navigation
- React Native Reanimated

---

**Note**: This is a demonstration project for educational purposes. For production use, consider additional security measures such as:
- Password-based key encryption for web storage
- Message delivery receipts
- WebSocket for real-time updates
- Rate limiting on server
- Input validation and sanitization
- Error handling and logging
