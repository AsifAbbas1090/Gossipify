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
  mime?: string | null;
  name?: string | null;
}) {
  const r = await fetch(`${SERVER_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const errorText = await r.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(errorText);
    } catch {
      errorDetails = { error: errorText };
    }
    console.error('Send message failed:', errorDetails, 'Payload:', payload);
    throw new Error(`send failed: ${errorDetails.error || errorText}`);
  }
  return r.json();
}

export async function poll(username: string, since: number) {
  const r = await fetch(`${SERVER_URL}/poll/${encodeURIComponent(username)}?since=${since}`);
  if (!r.ok) throw new Error('poll failed');
  return r.json();
}

export async function uploadAttachment(uri: string) {
  const form = new FormData();
  
  // For web, we need to fetch the file and create a Blob
  if (typeof window !== 'undefined' && (uri.startsWith('file://') || uri.startsWith('/'))) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      form.append('blob', blob, 'blob');
    } catch (e) {
      // Fallback to React Native FormData format
      form.append('blob', {
        // @ts-expect-error React Native FormData file fields
        uri,
        name: 'blob',
        type: 'application/octet-stream',
      } as any);
    }
  } else {
    // React Native FormData format
    form.append('blob', {
      // @ts-expect-error React Native FormData file fields
      uri,
      name: 'blob',
      type: 'application/octet-stream',
    } as any);
  }
  
  const r = await fetch(`${SERVER_URL}/upload`, {
    method: 'POST',
    body: form as any,
  });
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`upload failed: ${errorText}`);
  }
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


