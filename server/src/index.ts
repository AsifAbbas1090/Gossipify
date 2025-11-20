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
  mime?: string; // mime type for attachments
  name?: string; // file name for attachments
  deleted?: boolean;
  deletedAt?: number;
};

// Persistent file-based storage functions
function readUsers(): Record<string, PublicUser> {
  try {
    const content = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (e) {
    console.error('[SERVER] Error reading users file:', e);
    return {};
  }
}

function writeUsers(users: Record<string, PublicUser>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('[SERVER] Error writing users file:', e);
  }
}

function readMessages(): StoredMessage[] {
  try {
    const content = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (e) {
    console.error('[SERVER] Error reading messages file:', e);
    return [];
  }
}

function writeMessages(messages: StoredMessage[]) {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (e) {
    console.error('[SERVER] Error writing messages file:', e);
  }
}

// Register user
app.post('/register', (req, res) => {
  const { username, publicKey } = req.body || {};
  if (!username || !publicKey) {
    return res.status(400).json({ error: 'username and publicKey are required' });
  }
  // Normalize username to lowercase for consistency
  const normalizedUsername = String(username || '').trim().toLowerCase();
  if (!normalizedUsername) {
    return res.status(400).json({ error: 'username cannot be empty' });
  }
  const users = readUsers();
  users[normalizedUsername] = { username: normalizedUsername, publicKey };
  writeUsers(users);
  console.log(`[SERVER] User registered: ${normalizedUsername}`);
  return res.json({ ok: true });
});

// Get public key by username
app.get('/users/:username', (req, res) => {
  const users = readUsers();
  // Normalize username for lookup
  const normalizedUsername = String(req.params.username || '').trim().toLowerCase();
  
  // Try exact match first
  let user = users[normalizedUsername];
  
  // If not found, try case-insensitive search (for backward compatibility)
  if (!user) {
    const allUsernames = Object.keys(users);
    const found = allUsernames.find(u => u.toLowerCase() === normalizedUsername);
    if (found) {
      user = users[found];
      // Migrate to lowercase key for consistency
      users[normalizedUsername] = user;
      delete users[found];
      writeUsers(users);
      console.log(`[SERVER] Migrated user key from "${found}" to "${normalizedUsername}"`);
    }
  }
  
  if (!user) {
    const availableUsers = Object.keys(users);
    console.log(`[SERVER] User not found: "${normalizedUsername}". Available users: [${availableUsers.join(', ') || 'none'}]`);
    return res.status(404).json({ error: 'not found', availableUsers });
  }
  
  console.log(`[SERVER] User found: ${normalizedUsername}`);
  return res.json({ username: user.username, publicKey: user.publicKey });
});

// Send encrypted message
app.post('/send', (req, res) => {
  const { from, to, ciphertext, nonce, fingerprint, timestamp, attachmentId, mime, name } = req.body || {};
  // Allow empty ciphertext if attachmentId is provided
  // Check: must have either ciphertext (non-empty) or attachmentId
  const hasCiphertext = ciphertext && ciphertext.trim().length > 0;
  const hasAttachment = attachmentId && attachmentId.trim().length > 0;
  
  if (!from || !to || (!hasCiphertext && !hasAttachment) || !nonce || !timestamp || !fingerprint) {
    return res.status(400).json({ error: 'missing fields', details: { from: !!from, to: !!to, hasCiphertext, hasAttachment, hasNonce: !!nonce, hasTimestamp: !!timestamp, hasFingerprint: !!fingerprint } });
  }
  
  // Normalize usernames to lowercase for consistent storage
  const normalizedFrom = String(from || '').trim().toLowerCase();
  const normalizedTo = String(to || '').trim().toLowerCase();
  
  // Validate usernames are not empty and not the same
  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
    return res.status(400).json({ error: 'invalid from/to: usernames must be different and non-empty' });
  }
  
  const msg: StoredMessage = {
    id: nanoid(12),
    from: normalizedFrom, // Store normalized (lowercase)
    to: normalizedTo,     // Store normalized (lowercase)
    ciphertext: ciphertext || '', // Store empty string if not provided
    nonce,
    fingerprint,
    timestamp,
    attachmentId,
    mime,
    name,
  };
  const messages = readMessages();
  messages.push(msg);
  writeMessages(messages);
  console.log(`[SERVER] Message stored: ${msg.from} -> ${msg.to}, id: ${msg.id}, attachment: ${!!attachmentId}, timestamp: ${msg.timestamp}`);
  return res.json({ ok: true, id: msg.id });
});

// Poll messages for a user (returns messages both TO and FROM the user)
app.get('/poll/:username', (req, res) => {
  const username = req.params.username;
  const since = req.query.since ? Number(req.query.since) : 0;
  
  // Normalize username for lookup
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const all = readMessages();
  
  // Return messages both TO and FROM the user
  // Use case-insensitive comparison to handle username variations
  const filteredMessages = all.filter(m => {
    const msgFrom = String(m.from || '').trim().toLowerCase();
    const msgTo = String(m.to || '').trim().toLowerCase();
    const user = normalizedUsername;
    
    const isRelevant = (msgTo === user || msgFrom === user) && 
                       m.timestamp >= since && 
                       !m.deleted;
    
    return isRelevant;
  });
  
  const deletions = all
    .filter(m => {
      const msgFrom = String(m.from || '').trim().toLowerCase();
      const msgTo = String(m.to || '').trim().toLowerCase();
      const user = normalizedUsername;
      return (msgTo === user || msgFrom === user) && 
             m.deleted && 
             (m.deletedAt || 0) >= since;
    })
    .map(m => ({ id: m.id, deletedAt: m.deletedAt }));
  
  return res.json({ messages: filteredMessages, deletions });
});

// Delete message (best-effort) — server removes stored blob entry
app.post('/delete', (req, res) => {
  const { id, requester } = req.body || {};
  if (!id || !requester) return res.status(400).json({ error: 'id and requester required' });
  const normalizedRequester = String(requester || '').trim().toLowerCase();
  const messages = readMessages();
  const idx = messages.findIndex(m => m.id === id && (m.from === normalizedRequester || m.to === normalizedRequester));
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

// Get server stats (for debugging)
app.get('/stats', (_req, res) => {
  const users = readUsers();
  const messages = readMessages();
  return res.json({
    users: Object.keys(users).length,
    messages: messages.length,
    activeUsers: Object.keys(users),
  });
});

app.get('/', (_req, res) => {
  res.json({ name: 'gossipify-server', ok: true });
});

app.listen(PORT, () => {
  console.log(`Gossipify relay running on http://localhost:${PORT}`);
  console.log(`[SERVER] Using persistent file-based storage`);
  const users = readUsers();
  const userCount = Object.keys(users).length;
  console.log(`[SERVER] Loaded ${userCount} registered users: ${Object.keys(users).join(', ') || 'none'}`);
  
  // Migrate any non-lowercase usernames to lowercase for consistency
  let migrated = false;
  const normalizedUsers: Record<string, PublicUser> = {};
  for (const [key, user] of Object.entries(users)) {
    const normalizedKey = key.toLowerCase();
    if (key !== normalizedKey) {
      normalizedUsers[normalizedKey] = { ...user, username: normalizedKey };
      migrated = true;
      console.log(`[SERVER] Migrating user key: "${key}" -> "${normalizedKey}"`);
    } else {
      normalizedUsers[key] = user;
    }
  }
  if (migrated) {
    writeUsers(normalizedUsers);
    console.log(`[SERVER] Migration complete. Users normalized to lowercase.`);
  }
});
