# Gossipify Relay Server

Minimal Express server that stores and forwards encrypted blobs. It never sees plaintext or private keys.

## Run
```bash
npm install
npm run dev
```

## Endpoints
- POST /register { username, publicKey }
- GET /users/:username -> { username, publicKey }
- POST /send { from, to, ciphertext, nonce, fingerprint, timestamp, attachmentId? }
- GET /poll/:username?since=timestamp
- POST /delete { id, requester }
- POST /upload (multipart form-data: blob)
- GET /download/:id

Storage is JSON under `storage/`. This is for demo only.

Admin note: You can verify no plaintext is stored by inspecting `messages.json` and files under `attachments/`.


