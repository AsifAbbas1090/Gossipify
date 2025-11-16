# Security Discussion and Future Work

## Threat Model
- Passive and active network attackers can observe and modify traffic.
- Malicious server can inspect metadata and attempt protocol downgrades.
- Device compromise results in loss of confidentiality and integrity.

## Current Protections
- End-to-end encryption for messages and attachments using X25519 + XSalsa20-Poly1305.
- Private keys never leave the device and are stored in secure storage.
- Explicit, consent-based file access; no background gallery scans.

## Known Limitations
- No double ratchet: limited forward secrecy, no post-compromise security, no message deniability.
- No authenticated key verification ceremony; susceptible to MITM at first key fetch.
- Simple username registration; no password-authenticated key exchange.
- Metadata leakage (sender, recipient, timestamp, sizes) remains.

## Mitigations (Future)
- Add Signal protocol (X3DH + Double Ratchet) with prekeys and one-time prekeys.
- Key verification: QR codes and safety numbers, TOFU with warnings.
- Push notifications with sealed sender and payload minimization.
- Mixnet/onion routing or a simple indistinguishability-padding strategy for payload sizes and timings.
- Forward secrecy via frequent session key rotation.
- Secure backups using passphrase-protected key bundles with memory-hard KDFs (Argon2id).

## Ethics
- This app is for education/demonstration only.
- Users must explicitly consent to data processing and file access.
- Do not use this project to invade privacy or break laws.
