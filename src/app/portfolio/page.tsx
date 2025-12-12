'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePortfolio } from '@/lib/hooks/useTokens';
import { useMarketByNumericId } from '@/lib/hooks/useMarkets';
import { useAuth } from '@/providers/AuthProvider';
import ConnectModal from '@/components/ui/ConnectModal';
import AccountStats from '@/components/portfolio/AccountStats';
import ClaimEarnings from '@/components/portfolio/ClaimEarnings';
import ProxyWalletPanel from '@/components/wallet/ProxyWalletPanel';
import type { MarketPosition } from '@/types/token';

function formatBalance(balance: number): string {
  const value = balance / 1_000_000_000;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(4);
  if (value >= 0.0001) return value.toFixed(6);
  return '0';
}

function PositionCard({ position }: { position: MarketPosition }) {
  // position.marketId is the numeric market_id (u64) from tokens, not the object ID
  const { data: market } = useMarketByNumericId(position.marketId);

  return (
    <Link
      href={market?.id ? `/market/${market.id}` : '#'}
      className="block card p-3 md:p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2.5 md:gap-4">
        {/* Market Image */}
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[var(--gray-100)] flex items-center justify-center overflow-hidden flex-shrink-0">
          {market?.image ? (
            <img
              src={market.image}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          )}
        </div>

        {/* Market Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-medium text-[var(--foreground)] line-clamp-2 mb-1">
            {market?.title || 'Loading...'}
          </h3>
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-[var(--gray-500)]">
            {market?.status && (
              <span className={`px-1.5 py-0.5 rounded ${
                market.status === 'open' ? 'bg-green-100 text-green-700' :
                market.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                market.status === 'voided' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {market.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Token Balances */}
      <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 md:gap-3">
        <div className="p-2 bg-green-50 rounded-lg">
          <div className="text-[10px] md:text-xs text-[var(--gray-500)] mb-0.5 md:mb-1">YES</div>
          <div className="text-xs md:text-sm font-semibold text-green-600">
            {formatBalance(position.totalYesBalance)}
          </div>
        </div>
        <div className="p-2 bg-red-50 rounded-lg">
          <div className="text-[10px] md:text-xs text-[var(--gray-500)] mb-0.5 md:mb-1">NO</div>
          <div className="text-xs md:text-sm font-semibold text-red-600">
            {formatBalance(position.totalNoBalance)}
          </div>
        </div>
      </div>

      {/* Estimated Value */}
      {position.estimatedValue !== undefined && position.estimatedValue > 0 && (
        <div className="mt-2.5 md:mt-3 pt-2.5 md:pt-3 border-t border-[var(--gray-100)]">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-[var(--gray-500)]">Guaranteed Value</span>
            <span className="font-medium text-[var(--foreground)]">
              {formatBalance(position.estimatedValue)} SUI
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  const { user } = useAuth();

  if (!user?.address) {
    return (
      <div className="text-center py-8 md:py-12 px-4">
        <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
          <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-lg md:text-xl font-semibold text-[var(--foreground)] mb-1.5 md:mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-sm md:text-base text-[var(--gray-500)] mb-5 md:mb-6 max-w-md mx-auto">
          Connect your wallet to view your positions across all markets.
        </p>
        <button
          onClick={onConnect}
          className="px-5 md:px-6 py-2 md:py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm md:text-base font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8 md:py-12 px-4">
      <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      </div>
      <h2 className="text-lg md:text-xl font-semibold text-[var(--foreground)] mb-1.5 md:mb-2">
        No Positions Yet
      </h2>
      <p className="text-sm md:text-base text-[var(--gray-500)] mb-5 md:mb-6 max-w-md mx-auto">
        You don't have any token positions. Mint tokens on a market to get started.
      </p>
      <Link
        href="/"
        className="inline-block px-5 md:px-6 py-2 md:py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm md:text-base font-medium hover:bg-[var(--primary-hover)] transition-colors"
      >
        Browse Markets
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-3 md:p-4 animate-pulse">
          <div className="flex items-start gap-2.5 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[var(--gray-200)]" />
            <div className="flex-1 space-y-1.5 md:space-y-2">
              <div className="h-3.5 md:h-4 bg-[var(--gray-200)] rounded w-3/4" />
              <div className="h-2.5 md:h-3 bg-[var(--gray-200)] rounded w-1/4" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 md:gap-3">
            <div className="h-10 md:h-12 bg-[var(--gray-100)] rounded-lg" />
            <div className="h-10 md:h-12 bg-[var(--gray-100)] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const { data: portfolio, isLoading } = usePortfolio();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-0.5 md:mb-1">
            Portfolio
          </h1>
          <p className="text-sm md:text-base text-[var(--gray-500)]">
            View and manage your positions across all markets
          </p>
        </div>

        {/* Account Stats (Fee Tiers, Referrals, Creator Earnings) */}
        {user?.address && (
          <div className="mb-4 md:mb-6">
            <AccountStats />
          </div>
        )}

        {/* Claim Earnings - Shows when there are pending earnings */}
        {user?.address && (
          <div className="mb-4 md:mb-6">
            <ClaimEarnings />
          </div>
        )}

        {/* Proxy Wallet Panel */}
        {user?.address && (
          <div className="mb-4 md:mb-6">
            <ProxyWalletPanel onConnect={() => setIsConnectModalOpen(true)} />
          </div>
        )}

        {/* Portfolio Summary */}
        {user?.address && portfolio && portfolio.totalPositions > 0 && (
          <div className="card p-3 md:p-4 mb-4 md:mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <div className="text-xs md:text-sm text-[var(--gray-500)] mb-0.5 md:mb-1">Total Positions</div>
                <div className="text-lg md:text-xl font-semibold text-[var(--foreground)]">
                  {portfolio.totalPositions}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-[var(--gray-500)] mb-0.5 md:mb-1">Guaranteed Value</div>
                <div className="text-lg md:text-xl font-semibold text-[var(--foreground)]">
                  {formatBalance(portfolio.totalValue)} SUI
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="text-xs md:text-sm text-[var(--gray-500)] mb-0.5 md:mb-1">Wallet</div>
                <div className="text-xs md:text-sm font-mono text-[var(--foreground)] truncate">
                  {user.address.slice(0, 8)}...{user.address.slice(-6)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Positions List */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : !user?.address || !portfolio || portfolio.totalPositions === 0 ? (
          <EmptyState onConnect={() => setIsConnectModalOpen(true)} />
        ) : (
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-base md:text-lg font-semibold text-[var(--foreground)]">
              Your Positions
            </h2>
            {portfolio.positions.map((position) => (
              <PositionCard key={position.marketId} position={position} />
            ))}
          </div>
        )}
      </div>

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
    </div>
  );
}
