'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMarket, useEndTrading, useVoidByCreator } from '@/lib/hooks/useMarkets';
import { useMarketPosition } from '@/lib/hooks/useTokens';
import { useMarketTradingInfo, useLiquidityPool, usePriceHistory } from '@/lib/hooks/useTrading';
import { useAuth } from '@/providers/AuthProvider';
import MarketHeader from '@/components/market/detail/MarketHeader';
import TradingPanel from '@/components/trading/TradingPanel';
import TradeHistory from '@/components/trading/TradeHistory';
import OpenOrdersPanel from '@/components/trading/OpenOrdersPanel';
import OutcomeRow from '@/components/market/detail/OutcomeRow';
import PriceChart from '@/components/market/detail/PriceChart';
import MarketRules from '@/components/market/detail/MarketRules';
import ConnectModal from '@/components/ui/ConnectModal';
import TokenPanel from '@/components/token/TokenPanel';
import UserPosition from '@/components/token/UserPosition';
import OracleResolutionPanel from '@/components/oracle/OracleResolutionPanel';

function formatDate(date: Date | undefined): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function StatusBadge({ status }: { status: string | undefined }) {
  const styles: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    trading_ended: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-blue-100 text-blue-700',
    voided: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    open: 'Open',
    trading_ended: 'Trading Ended',
    resolved: 'Resolved',
    voided: 'Voided',
  };

  return (
    <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${styles[status || 'open'] || styles.open}`}>
      {labels[status || 'open'] || 'Open'}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8 pb-20 md:pb-8">
        <div className="animate-pulse space-y-4 md:space-y-6">
          <div className="h-6 md:h-8 bg-[var(--gray-200)] rounded w-3/4" />
          <div className="h-3 md:h-4 bg-[var(--gray-200)] rounded w-1/2" />
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <div className="bg-white rounded-xl p-4 md:p-6 h-56 md:h-64" />
              <div className="bg-white rounded-xl p-4 md:p-6 h-40 md:h-48" />
            </div>
            <div className="bg-white rounded-xl p-4 md:p-6 h-80 md:h-96" />
          </div>
        </div>
      </div>
    </div>
  );
}


export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  const { data: market, isLoading, error } = useMarket(marketId);
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);

  // Token position
  const { data: position } = useMarketPosition(marketId);

  // Fetch live pool price - use market.marketId if available
  const { poolId } = useMarketTradingInfo(market?.marketId);
  const { data: pool } = useLiquidityPool(poolId || undefined);

  // Mutations
  const endTradingMutation = useEndTrading();
  const voidMutation = useVoidByCreator();

  // Calculate live price from pool (AMM price) - must be before early returns
  const liveYesPrice = pool ? Math.round(pool.yesPricePercent) : null;
  const currentYesPrice = liveYesPrice ?? 50;

  // Fetch real price history from swap events
  // Pass market creation time so chart only shows data from when market was created
  const marketCreatedAtMs = market?.createdAt ? market.createdAt.getTime() : undefined;
  const { data: priceData } = usePriceHistory(market?.marketId, currentYesPrice, marketCreatedAtMs);

  // Get Yes/No labels from outcomes - use live price if available
  // Must be called unconditionally (before early returns)
  const outcomesWithLivePrice = useMemo(() => {
    if (!market?.outcomes?.length) return [];

    const yesPrice = liveYesPrice ?? market.outcomes[0]?.price ?? 50;
    const noPrice = 100 - yesPrice;

    return market.outcomes.map((outcome, index) => ({
      ...outcome,
      price: index === 0 ? yesPrice : noPrice,
    }));
  }, [market?.outcomes, liveYesPrice]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-[var(--foreground)] mb-1.5 md:mb-2">Market not found</h2>
          <p className="text-sm md:text-base text-[var(--gray-500)] mb-4">This market may not exist or has been removed.</p>
          <Link href="/" className="text-sm md:text-base text-[var(--primary)] hover:underline">
            Back to markets
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = user?.address === market.creator;
  const canVoid = isCreator && market.status === 'open';
  const canEndTrading = market.status === 'open' && market.endTime && new Date() > market.endTime;
  const isConnected = !!user?.address;

  const yesOutcome = outcomesWithLivePrice[0];
  const noOutcome = outcomesWithLivePrice[1];

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: Persist bookmark state
  };

  const handleEndTrading = async () => {
    try {
      await endTradingMutation.mutateAsync(marketId);
    } catch (error) {
      console.error('Failed to end trading:', error);
    }
  };

  const handleVoidMarket = async () => {
    try {
      await voidMutation.mutateAsync({ marketId, reason: voidReason || 'Voided by creator' });
      setShowVoidModal(false);
      setVoidReason('');
    } catch (error) {
      console.error('Failed to void market:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-6 pb-20 md:pb-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-[var(--gray-600)] hover:text-[var(--foreground)] mb-4 md:mb-6"
        >
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to markets
        </Link>

        {/* Header Section */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-start gap-2 md:gap-4">
            <div className="flex-1 min-w-0">
              <MarketHeader
                market={market}
                onBookmark={handleBookmark}
                isBookmarked={isBookmarked}
              />
            </div>
            <StatusBadge status={market.status} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Chart & Details */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Price Chart */}
            <PriceChart
              data={priceData || []}
              yesLabel={yesOutcome?.name || 'Yes'}
              noLabel={noOutcome?.name || 'No'}
            />

            {/* Outcomes List */}
            {outcomesWithLivePrice.length > 0 && (
              <div className="card p-3 md:p-5">
                <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-2 md:mb-3">
                  Outcomes
                </h3>
                <div>
                  {outcomesWithLivePrice.map((outcome) => (
                    <OutcomeRow
                      key={outcome.id}
                      outcome={outcome}
                      volume={market.volume}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Trade History / Activity Feed */}
            <TradeHistory marketId={market.marketId} />

            {/* Market Rules/Description */}
            <MarketRules
              rules={market.description || 'No description provided.'}
              resolutionSource={market.resolutionType === 'oracle' ? 'Oracle Resolution' : 'Admin Resolution'}
            />

            {/* Market Details Card */}
            <div className="card p-3 md:p-5">
              <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-3 md:mb-4">
                Market Details
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                <div>
                  <div className="text-[var(--gray-500)]">Created</div>
                  <div className="font-medium text-[var(--foreground)]">{formatDate(market.createdAt)}</div>
                </div>
                <div>
                  <div className="text-[var(--gray-500)]">Trading Ends</div>
                  <div className="font-medium text-[var(--foreground)]">{formatDate(market.endTime)}</div>
                </div>
                <div>
                  <div className="text-[var(--gray-500)]">Resolution Type</div>
                  <div className="font-medium text-[var(--foreground)] capitalize">{market.resolutionType || 'Oracle'}</div>
                </div>
                <div>
                  <div className="text-[var(--gray-500)]">Status</div>
                  <div className="font-medium text-[var(--foreground)] capitalize">{market.status?.replace('_', ' ') || 'Open'}</div>
                </div>
                {market.outcome && (
                  <div className="col-span-2">
                    <div className="text-[var(--gray-500)]">Winning Outcome</div>
                    <div className="font-medium text-[var(--foreground)] capitalize">{market.outcome}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Trading Panel & Info */}
          <div className="space-y-4 md:space-y-6">
            {/* Trading Panel - Swap/Order/Liquidity */}
            <TradingPanel
              marketId={marketId}
              marketIdNum={market.marketId}
              marketStatus={market.status || 'open'}
              isConnected={isConnected}
              onConnect={() => setIsConnectModalOpen(true)}
            />

            {/* Token Panel - Mint/Merge */}
            <TokenPanel
              marketId={marketId}
              marketStatus={market.status || 'open'}
              isConnected={isConnected}
              position={position}
              onConnect={() => setIsConnectModalOpen(true)}
            />

            {/* User's Position */}
            <UserPosition
              marketId={marketId}
              marketStatus={market.status || 'open'}
              marketOutcome={market.outcome}
              isConnected={isConnected}
            />

            {/* Open Orders with Cancel */}
            <OpenOrdersPanel
              marketId={market.marketId}
              onConnect={() => setIsConnectModalOpen(true)}
            />

            {/* Oracle Resolution Panel - shows when trading has ended */}
            <OracleResolutionPanel
              marketId={marketId}
              marketIdNum={market.marketId}
              marketStatus={market.status || 'open'}
              onConnect={() => setIsConnectModalOpen(true)}
            />

            {/* Market Status Cards */}
            {market.status === 'resolved' && (
              <div className="card p-3 md:p-5">
                <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-3 md:mb-4">Result</h3>
                <div className="text-center py-3 md:py-4">
                  <div className="text-xl md:text-2xl font-bold text-[var(--foreground)] capitalize mb-1">
                    {market.outcome}
                  </div>
                  <div className="text-xs md:text-sm text-[var(--gray-500)]">Winning outcome</div>
                </div>
              </div>
            )}

            {market.status === 'voided' && (
              <div className="card p-3 md:p-5">
                <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-3 md:mb-4">Status</h3>
                <div className="text-center py-3 md:py-4">
                  <div className="text-base md:text-lg font-medium text-[var(--danger)] mb-1">Market Voided</div>
                  <div className="text-xs md:text-sm text-[var(--gray-500)]">All positions refunded</div>
                </div>
              </div>
            )}

            {market.status === 'trading_ended' && (
              <div className="card p-3 md:p-5">
                <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-3 md:mb-4">Status</h3>
                <div className="text-center py-3 md:py-4">
                  <div className="text-base md:text-lg font-medium text-[var(--gray-600)] mb-1">Trading Ended</div>
                  <div className="text-xs md:text-sm text-[var(--gray-500)]">Awaiting resolution</div>
                </div>
              </div>
            )}

            {/* Creator Info */}
            <div className="card p-3 md:p-5">
              <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-2 md:mb-3">Creator</h3>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                  <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm font-medium text-[var(--foreground)] truncate">
                    {market.creator ? `${market.creator.slice(0, 6)}...${market.creator.slice(-4)}` : 'Unknown'}
                  </div>
                  {isCreator && (
                    <div className="text-[10px] md:text-xs text-[var(--primary)]">You</div>
                  )}
                </div>
              </div>
            </div>

            {/* Market Actions */}
            {(isCreator || canEndTrading) && market.status === 'open' && (
              <div className="card p-3 md:p-5">
                <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-2 md:mb-3">Market Actions</h3>
                <div className="space-y-2 md:space-y-3">
                  {/* End Trading Button - anyone can call when time has passed */}
                  {canEndTrading && (
                    <button
                      onClick={handleEndTrading}
                      disabled={endTradingMutation.isPending}
                      className="w-full py-1.5 md:py-2 bg-[var(--primary)] text-white rounded-lg text-xs md:text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                    >
                      {endTradingMutation.isPending ? 'Ending Trading...' : 'End Trading'}
                    </button>
                  )}

                  {/* Void Market Button - only creator */}
                  {canVoid && (
                    <button
                      onClick={() => setShowVoidModal(true)}
                      disabled={voidMutation.isPending}
                      className="w-full py-1.5 md:py-2 border border-[var(--danger)] text-[var(--danger)] rounded-lg text-xs md:text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {voidMutation.isPending ? 'Voiding...' : 'Void Market'}
                    </button>
                  )}

                  {!canEndTrading && !canVoid && isCreator && (
                    <p className="text-xs md:text-sm text-[var(--gray-500)]">
                      No actions available yet. You can void this market or end trading when the end time passes.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Status for non-open markets */}
            {isCreator && market.status !== 'open' && (
              <div className="card p-3 md:p-5">
                <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-2 md:mb-3">Market Actions</h3>
                <p className="text-xs md:text-sm text-[var(--gray-500)]">
                  {market.status === 'trading_ended'
                    ? 'Trading has ended. Awaiting resolution.'
                    : market.status === 'resolved'
                    ? 'Market has been resolved.'
                    : market.status === 'voided'
                    ? 'Market has been voided.'
                    : 'No actions available.'}
                </p>
              </div>
            )}

            {/* Market ID */}
            <div className="card p-3 md:p-5">
              <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-2 md:mb-3">Market ID</h3>
              <div className="text-[10px] md:text-xs text-[var(--gray-500)] break-all font-mono bg-[var(--gray-50)] p-1.5 md:p-2 rounded">
                {marketId}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* Void Market Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoidModal(false)}
          />
          <div className="relative bg-white rounded-xl p-4 md:p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base md:text-lg font-semibold text-[var(--foreground)] mb-3 md:mb-4">
              Void Market
            </h3>
            <p className="text-xs md:text-sm text-[var(--gray-600)] mb-3 md:mb-4">
              Are you sure you want to void this market? This action cannot be undone.
            </p>
            <div className="mb-3 md:mb-4">
              <label className="block text-xs md:text-sm font-medium text-[var(--gray-700)] mb-1.5 md:mb-2">
                Reason (optional)
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Event cancelled, duplicate market..."
                className="w-full px-2.5 md:px-3 py-1.5 md:py-2 border border-[var(--gray-300)] rounded-lg text-xs md:text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={() => setShowVoidModal(false)}
                className="flex-1 py-1.5 md:py-2 border border-[var(--gray-300)] text-[var(--gray-700)] rounded-lg text-xs md:text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidMarket}
                disabled={voidMutation.isPending}
                className="flex-1 py-1.5 md:py-2 bg-[var(--danger)] text-white rounded-lg text-xs md:text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {voidMutation.isPending ? 'Voiding...' : 'Void Market'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
