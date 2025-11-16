# Gossipify — Security Architecture Report

Author: Muhammad Asif Abbas (BITF22M002)
Subject: Information Security

## Goals
- End-to-end encryption (E2EE) for text messages and attachments.
- Server acts strictly as a relay and cannot decrypt content.
- Educational, consent-first app with clear privacy explanations.

## Cryptography
- Curve25519 (X25519) key agreement using TweetNaCl (`nacl.box.before`).
- Symmetric encryption: XSalsa20-Poly1305 via `nacl.secretbox`.
- Conversation key: derived from X25519 shared secret and conversation identifier (KDF: hash -> first 32 bytes).
- Per-message nonces: random 24-byte nonces generated client-side.
- Sender fingerprint: first bytes of hash(publicKey) attached in message metadata.

## Key management
- On first launch, client generates a long-term keypair.
- Private key stored in secure storage (Expo SecureStore).
- Public key registered with server bound to a username.
- Backup: export/import encrypted key file with a user passphrase.

## Server role
- Endpoints to register public keys, send encrypted messages, poll for delivery, upload/download opaque attachments, and delete by id.
- JSON persistence under `server/storage/`. Messages are stored as opaque ciphertext with nonce and routing metadata.

## Metadata exposure
- Server sees sender, recipient, timestamps, approximate sizes, attachment existence.
- No plaintext or keys are stored or transmitted to the server.
- Mitigations (future work): batching, padding, delayed delivery, mix networks, onion routing.

## Threat model
- Adversary controls the server and network but lacks client private keys.
- Compromised client can exfiltrate keys or plaintext.
- No protection against active MITM during key bootstrap (no key verification ceremony in this assignment). Users should verify peer key fingerprints out-of-band for stronger security.

## Testing steps
- Verify server storage contains only ciphertext and nonces.
- Attempt decryption on the server using stored data should fail (no keys).
- Client-only decryption success when keys match.
- Attachments: upload opaque blob; recipient successfully decrypts locally.

## Limitations
- No double ratchet: limited forward secrecy and no post-compromise security.
- No safety number / key verification UI.
- Polling instead of push or WebSocket delivery.
- Simple deletion signaling; already-delivered messages may persist on recipient devices.

## Recommendations
- Adopt Signal protocol (double ratchet) for per-message forward secrecy.
- Implement key verification (QR codes / safety numbers) and TOFU with warnings.
- Consider secure remote password (SRP) or OPAQUE for authenticated login.
- Use push notifications with privacy-preserving payloads (no plaintext, sealed sender).
- Harden storage (hardware-backed keystores) and add biometric locks.
