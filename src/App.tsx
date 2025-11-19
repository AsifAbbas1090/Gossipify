/**
 * Main App component - WhatsApp Web style
 */

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import AppShell from './components/AppShell';
import Settings from './components/Settings';
import './styles/index.css';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const email = prompt('Enter your email:');
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      alert(`Sign in failed: ${error.message}`);
    } else {
      alert('Check your email for the login link!');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EFEAE2]">
        <p className="text-[#667781]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EFEAE2]">
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-lg transition-colors font-medium"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="h-screen overflow-auto bg-white">
        <div className="p-4 border-b border-[#E9EDEF] bg-[#F0F2F5]">
          <button
            onClick={() => setShowSettings(false)}
            className="text-[#25D366] hover:text-[#20BA5A] font-medium"
          >
            ← Back
          </button>
        </div>
        <Settings />
        <div className="p-4 border-t border-[#E9EDEF]">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-[#F15C6D] text-white rounded-lg hover:bg-[#E53E3E] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#EFEAE2]">
      <div className="h-[60px] px-4 bg-[#F0F2F5] border-b border-[#E9EDEF] flex items-center justify-end">
        <button
          onClick={() => setShowSettings(true)}
          className="wa-button"
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </div>
      <AppShell />
    </div>
  );
}
