/**
 * Modal for blocking/unblocking users
 */

import { useState } from 'react';
import { blockUser, unblockUser } from '../lib/blocked';
import { searchUsers } from '../lib/profiles';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlocked: () => void;
}

export default function BlockUserModal({ isOpen, onClose, onBlocked }: BlockUserModalProps) {
  const [username, setUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!username.trim()) return;
    setSearching(true);
    try {
      const users = await searchUsers(username.trim());
      setResults(users);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleBlock = async (userId: string, userUsername: string) => {
    if (!confirm(`Block ${userUsername}? They won't be able to send you messages.`)) {
      return;
    }
    try {
      await blockUser(userId);
      alert('User blocked');
      onBlocked();
      onClose();
      setUsername('');
      setResults([]);
    } catch (error) {
      console.error('Block failed:', error);
      alert('Failed to block user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Block User</h2>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by username..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !username.trim()}
              className="mt-2 w-full px-4 py-2 bg-[#0FA3A3] text-white rounded-lg hover:bg-[#0d8a8a] disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {results.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700"
                >
                  <span className="text-gray-900 dark:text-white">{user.username}</span>
                  <button
                    onClick={() => handleBlock(user.id, user.username)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  >
                    Block
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}

