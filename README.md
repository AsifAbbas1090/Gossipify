# Gossipify — Share your gossips here

Educational, end-to-end encrypted, mobile chat app built with Expo (React Native + TypeScript) and a minimal Node.js relay server. Gossipify is consent-first and never exfiltrates private data without explicit user action. All message encryption/decryption happens on the client; the server stores only opaque encrypted blobs and minimal metadata.

## Quick start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm i -g expo` (or use `npx expo`)
- Two devices/emulators/simulators recommended for the demo

### 1) Start the relay server
```bash
cd server
npm install
npm run dev
```
Server starts on http://localhost:4000 by default. For mobile devices on the same LAN, use your machine's LAN IP (e.g., http://192.168.1.10:4000). You can change the port via the `PORT` env var.

### 2) Start the Expo client
```bash
cd client
npm install
npx expo start
```
Open the app on two clients (two emulators or one device + one emulator). Update `SERVER_URL` in `client/src/config.ts` to your server's reachable URL (LAN IP recommended).

### Demo script (grader flow)
1. Launch server and two clients.
2. On first launch, each client registers: choose a username. The app generates an X25519 keypair and stores the private key in secure storage.
3. Start a chat: enter the other user's username. The app fetches that user's public key from the server, derives a shared secret, and creates a symmetric conversation key.
4. Send messages. The server stores only ciphertext, nonce, and metadata (from, to, timestamp). Verify in `server/storage/messages.json` that plaintext is not present.
5. Attach an image/file: the file is encrypted client-side and uploaded as an opaque blob. Recipient downloads and decrypts client-side.
6. Optionally delete a message (local or "delete for everyone"). The server removes the blob but cannot decrypt contents.

## Architecture overview
- Client (Expo RN + TS)
  - Crypto: Curve25519 for key agreement, XSalsa20-Poly1305 for AEAD (via TweetNaCl). Per-conversation symmetric key derived from the X25519 shared secret.
  - Private keys in secure storage (Expo SecureStore). Public keys registered on the server.
  - Attachments encrypted with the conversation key and uploaded/downladed as opaque blobs.
  - Polling-based delivery for simplicity. Delivered/seen are client-side flags.
- Server (Node.js + Express)
  - Relay only. Stores usernames+public keys, encrypted message blobs, timestamps, and routing metadata. Cannot decrypt.
  - JSON file persistence for demo in `server/storage/`.

## Security model (assignment level)
- End-to-end encryption for message payloads and attachments using authenticated encryption.
- Key exchange: Clients fetch peer public keys and derive shared secrets (X25519). Conversation symmetric keys are derived from the shared secret.
- Per-message nonces; messages include a sender public key fingerprint.
- Metadata visible to the server: sender, recipient, timestamps, sizes. This is a known limitation; see `security_discussion.md`.
- Limitations: No double ratchet/forward secrecy or push-notification-secure envelopes. No key verification ceremony. See recommended improvements in `security_discussion.md`.

## Ethical use and consent
"Gossipify is an educational demo implementing client-side encryption. It never attempts to access a user’s files without explicit permission. Do not use this project to invade anyone’s privacy. Unauthorized access to other people’s data is unlawful and unethical."

## Repo layout
```
client/                 # Expo app (React Native + TypeScript)
server/                 # Node.js relay server (Express, JSON persistence)
assets/
  screenshots/          # Placeholder screenshots (PNG)
logo.svg                # Wordmark and chat icon (light)
logo-dark.svg           # Dark-mode variant
README.md               # This file
report.md               # Security architecture and testing steps
security_discussion.md  # Threat model, limitations, future work
```

## Build & run
- Server: `cd server && npm install && npm run dev`
- Client: `cd client && npm install && npx expo start`

### Production notes (non-goal)
- Consider replacing polling with WebSockets.
- Use a real database for persistence.
- Replace NaCl box/secretbox with a modern double-ratchet protocol (e.g., libsignal).

## Student metadata
- Subject: Information Security
- Student: Muhammad Asif Abbas (BITF22M002)
- Project: Gossipify — "Share your gossips here"


