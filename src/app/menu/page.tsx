'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useBalance } from '@/lib/hooks/useBalance';
import ConnectModal from '@/components/ui/ConnectModal';
import HowItWorksModal from '@/components/ui/HowItWorksModal';

export default function MenuPage() {
  const { user, isAuthenticated, authMethod, logout } = useAuth();
  const { data: balance, isLoading: isBalanceLoading } = useBalance();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <main className="max-w-lg mx-auto px-3 py-4 pb-20">
      {/* User Section */}
      {isAuthenticated && user ? (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {user.name && (
                <div className="font-medium text-[var(--foreground)] truncate">
                  {user.name}
                </div>
              )}
              <div className="text-xs text-[var(--gray-500)] truncate">
                {formatAddress(user.address)}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                  {authMethod === 'wallet' ? 'Wallet' : 'Google'}
                </span>
                <span className="text-[10px] text-[var(--gray-500)]">Testnet</span>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="p-3 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--gray-500)]">Balance</span>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {isBalanceLoading ? (
                  <span className="inline-block w-16 h-4 bg-[var(--gray-200)] rounded animate-pulse" />
                ) : (
                  balance?.formatted || '0 SUI'
                )}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 mb-4">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gray-400)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">
              Connect Your Wallet
            </h2>
            <p className="text-sm text-[var(--gray-500)] mb-4">
              Sign in to access all features
            </p>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="card overflow-hidden mb-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--border)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">Home</span>
        </Link>

        <Link
          href="/markets"
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--border)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">All Markets</span>
        </Link>

        <Link
          href="/trending"
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--border)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">Trending</span>
        </Link>

        <Link
          href="/search"
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">Search</span>
        </Link>
      </div>

      {/* Account Links (when authenticated) */}
      {isAuthenticated && user && (
        <div className="card overflow-hidden mb-4">
          <Link
            href="/portfolio"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--border)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
            <span className="text-sm font-medium text-[var(--foreground)]">Portfolio</span>
          </Link>

          <Link
            href="/activity"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--border)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span className="text-sm font-medium text-[var(--foreground)]">Activity</span>
          </Link>

          <button
            onClick={() => navigator.clipboard.writeText(user.address)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors text-left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span className="text-sm font-medium text-[var(--foreground)]">Copy Address</span>
          </button>
        </div>
      )}

      {/* Info Links */}
      <div className="card overflow-hidden mb-4">
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--border)] text-left"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">How it Works</span>
        </button>

        <a
          href="https://discord.gg/veredic"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--border)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">Discord</span>
        </a>

        <a
          href="https://twitter.com/veredic"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">Twitter / X</span>
        </a>
      </div>

      {/* Logout */}
      {isAuthenticated && (
        <div className="card overflow-hidden">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--no-red-bg)] text-[var(--no-red)] transition-colors text-left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-sm font-medium">Disconnect</span>
          </button>
        </div>
      )}

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </main>
  );
}
