import { SERVER_URL } from '../config';

export async function register(username: string, publicKey: string) {
  const r = await fetch(`${SERVER_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, publicKey }),
  });
  if (!r.ok) throw new Error('register failed');
  return r.json();
}

export async function getPublicKey(username: string): Promise<string | null> {
  const r = await fetch(`${SERVER_URL}/users/${encodeURIComponent(username)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('get user failed');
  const data = await r.json();
  return data.publicKey as string;
}

export async function sendMessage(payload: {
  from: string;
  to: string;
  ciphertext: string;
  nonce: string;
  fingerprint: string;
  timestamp: number;
  attachmentId?: string;
}) {
  const r = await fetch(`${SERVER_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('send failed');
  return r.json();
}

export async function poll(username: string, since: number) {
  const r = await fetch(`${SERVER_URL}/poll/${encodeURIComponent(username)}?since=${since}`);
  if (!r.ok) throw new Error('poll failed');
  return r.json();
}

export async function uploadAttachment(uri: string) {
  const form = new FormData();
  form.append('blob', {
    // @ts-expect-error React Native FormData file fields
    uri,
    name: 'blob',
    type: 'application/octet-stream',
  });
  const r = await fetch(`${SERVER_URL}/upload`, {
    method: 'POST',
    body: form as any,
  });
  if (!r.ok) throw new Error('upload failed');
  return r.json();
}

export async function downloadAttachment(id: string): Promise<ArrayBuffer> {
  const r = await fetch(`${SERVER_URL}/download/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('download failed');
  return r.arrayBuffer();
}

export async function deleteMessage(id: string, requester: string) {
  const r = await fetch(`${SERVER_URL}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, requester }),
  });
  if (!r.ok) throw new Error('delete failed');
  return r.json();
}


