/**
 * Settings panel with key management and blocked users
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile, updateProfile } from '../lib/profiles';
import { generateKeyPair, fingerprintPublicKey, encryptPrivateKey } from '../lib/crypto';
import { storeEncryptedKey, getEncryptedKey } from '../lib/storage';
import { getBlockedUsers, unblockUser } from '../lib/blocked';
import type { BlockedUser } from '../lib/supabase';
import BlockUserModal from './BlockUserModal';

export default function Settings() {
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const profile = await getProfile(user.id);
      if (profile) {
        setUsername(profile.username);
        setPublicKey(profile.public_key);
        const fp = await fingerprintPublicKey(profile.public_key);
        setFingerprint(fp);
      }

      const blocked = await getBlockedUsers();
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKeys = async () => {
    const password = prompt('Enter a password to encrypt your private key:');
    if (!password) return;

    try {
      const keypair = await generateKeyPair();
      const { encrypted, salt } = await encryptPrivateKey(keypair.privateKey, password);

      await storeEncryptedKey(keypair.publicKey, encrypted, salt);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { upsertProfile } = await import('../lib/profiles');
        await upsertProfile(username || user.email || '', keypair.publicKey);
        setPublicKey(keypair.publicKey);
        const fp = await fingerprintPublicKey(keypair.publicKey);
        setFingerprint(fp);
      }

      alert('New keypair generated and stored securely!');
    } catch (error) {
      console.error('Failed to generate keys:', error);
      alert('Failed to generate keys');
    }
  };

  const handleExportKeys = async () => {
    const stored = await getEncryptedKey();
    if (!stored) {
      alert('No keys found');
      return;
    }

    const data = {
      publicKey: stored.publicKey,
      encrypted: stored.encrypted,
      salt: stored.salt,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gossipify-keys-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUnblock = async (blockedId: string) => {
    try {
      await unblockUser(blockedId);
      await loadSettings();
    } catch (error) {
      console.error('Failed to unblock:', error);
      alert('Failed to unblock user');
    }
  };

  if (loading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Profile */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Profile</h3>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <button
          onClick={async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await updateProfile(username);
              alert('Profile updated');
            }
          }}
          className="mt-2 px-4 py-2 bg-primary.light text-white rounded-lg"
        >
          Update Profile
        </button>
      </section>

      {/* Keys */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Encryption Keys</h3>
        {publicKey ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Fingerprint:</strong> {fingerprint}
            </p>
            <button
              onClick={handleExportKeys}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              Export Keys (Backup)
            </button>
            <p className="text-xs text-gray-500">
              ⚠️ Keep your backup secure. If you lose your private key, you
              cannot decrypt old messages.
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerateKeys}
            className="px-4 py-2 bg-[#0FA3A3] hover:bg-[#0d8a8a] text-white rounded-lg transition-colors"
          >
            Generate Keys
          </button>
        )}
      </section>

      {/* Blocked Users */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Blocked Users</h3>
        {blockedUsers.length === 0 ? (
          <p className="text-gray-500">No blocked users</p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((blocked) => (
              <div
                key={`${blocked.blocker}-${blocked.blocked}`}
                className="flex items-center justify-between p-2 bg-gray-100 rounded"
              >
                <span>{blocked.blocked}</span>
                <button
                  onClick={() => handleUnblock(blocked.blocked)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

