import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const DATA_DIR = path.join(__dirname, '..', 'storage');
const ATTACH_DIR = path.join(DATA_DIR, 'attachments');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Ensure storage directories/files exist
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}));
  if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
}

ensureStorage();

type PublicUser = { username: string; publicKey: string };
type StoredMessage = {
  id: string;
  from: string;
  to: string;
  ciphertext: string; // base64
  nonce: string; // base64
  fingerprint: string; // sender pubkey fingerprint
  timestamp: number;
  attachmentId?: string; // optional id for attachment
  deleted?: boolean;
  deletedAt?: number;
};

function readUsers(): Record<string, PublicUser> {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users: Record<string, PublicUser>) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readMessages(): StoredMessage[] {
  return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
}

function writeMessages(messages: StoredMessage[]) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

// Register user
app.post('/register', (req, res) => {
  const { username, publicKey } = req.body || {};
  if (!username || !publicKey) {
    return res.status(400).json({ error: 'username and publicKey are required' });
  }
  const users = readUsers();
  users[username] = { username, publicKey };
  writeUsers(users);
  return res.json({ ok: true });
});

// Get public key by username
app.get('/users/:username', (req, res) => {
  const users = readUsers();
  const user = users[req.params.username];
  if (!user) return res.status(404).json({ error: 'not found' });
  return res.json({ username: user.username, publicKey: user.publicKey });
});

// Send encrypted message
app.post('/send', (req, res) => {
  const { from, to, ciphertext, nonce, fingerprint, timestamp, attachmentId } = req.body || {};
  if (!from || !to || !ciphertext || !nonce || !timestamp || !fingerprint) {
    return res.status(400).json({ error: 'missing fields' });
  }
  const msg: StoredMessage = {
    id: nanoid(12),
    from,
    to,
    ciphertext,
    nonce,
    fingerprint,
    timestamp,
    attachmentId,
  };
  const messages = readMessages();
  messages.push(msg);
  writeMessages(messages);
  return res.json({ ok: true, id: msg.id });
});

// Poll messages for a user
app.get('/poll/:username', (req, res) => {
  const username = req.params.username;
  const since = req.query.since ? Number(req.query.since) : 0;
  const all = readMessages();
  const messages = all.filter(m => m.to === username && m.timestamp >= since && !m.deleted);
  const deletions = all
    .filter(m => m.to === username && m.deleted && (m.deletedAt || 0) >= since)
    .map(m => ({ id: m.id, deletedAt: m.deletedAt }));
  return res.json({ messages, deletions });
});

// Delete message (best-effort) — server removes stored blob entry
app.post('/delete', (req, res) => {
  const { id, requester } = req.body || {};
  if (!id || !requester) return res.status(400).json({ error: 'id and requester required' });
  const messages = readMessages();
  const idx = messages.findIndex(m => m.id === id && (m.from === requester || m.to === requester));
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  messages[idx].deleted = true;
  messages[idx].deletedAt = Date.now();
  writeMessages(messages);
  return res.json({ ok: true });
});

// Attachment upload/download
const upload = multer({ dest: ATTACH_DIR });

app.post('/upload', upload.single('blob'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const id = nanoid(12);
  const finalPath = path.join(ATTACH_DIR, id);
  fs.renameSync(req.file.path, finalPath);
  return res.json({ id });
});

app.get('/download/:id', (req, res) => {
  const id = req.params.id;
  const p = path.join(ATTACH_DIR, id);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'not found' });
  res.sendFile(p);
});

app.get('/', (_req, res) => {
  res.json({ name: 'gossipify-server', ok: true });
});

app.listen(PORT, () => {
  console.log(`Gossipify relay running on http://localhost:${PORT}`);
});


