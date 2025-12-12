'use client';

import { useState } from 'react';
import {
  useMarketPosition,
  useRedeemYes,
  useRedeemNo,
  useRedeemVoided,
  useVaultForMarket,
  useConsolidateAllTokens
} from '@/lib/hooks/useTokens';

interface UserPositionProps {
  marketId: string;
  marketStatus: string;
  marketOutcome?: 'yes' | 'no' | null;
  isConnected: boolean;
}

function formatBalance(balance: number): string {
  const value = balance / 1_000_000_000;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(6);
}

export default function UserPosition({
  marketId,
  marketStatus,
  marketOutcome,
  isConnected,
}: UserPositionProps) {
  const [consolidateError, setConsolidateError] = useState<string | null>(null);
  const { data: position, isLoading } = useMarketPosition(marketId);
  const { data: vaultId } = useVaultForMarket(marketId);

  const redeemYesMutation = useRedeemYes();
  const redeemNoMutation = useRedeemNo();
  const redeemVoidedMutation = useRedeemVoided();
  const { consolidateAll, isPending: isConsolidating } = useConsolidateAllTokens();

  const isPending = redeemYesMutation.isPending || redeemNoMutation.isPending || redeemVoidedMutation.isPending || isConsolidating;

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-[var(--foreground)] mb-3">Your Position</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-[var(--gray-200)] rounded w-1/2" />
          <div className="h-4 bg-[var(--gray-200)] rounded w-1/3" />
        </div>
      </div>
    );
  }

  const hasPosition = position && (position.totalYesBalance > 0 || position.totalNoBalance > 0);

  if (!hasPosition) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-[var(--foreground)] mb-3">Your Position</h3>
        <p className="text-sm text-[var(--gray-500)]">
          You don't have any tokens in this market yet.
        </p>
      </div>
    );
  }

  const handleRedeemYes = async () => {
    if (!vaultId || !position?.yesTokens[0]) return;

    try {
      await redeemYesMutation.mutateAsync({
        marketId,
        vaultId,
        tokenId: position.yesTokens[0].id,
        tokenType: 'yes',
      });
    } catch (err) {
      console.error('Failed to redeem YES:', err);
    }
  };

  const handleRedeemNo = async () => {
    if (!vaultId || !position?.noTokens[0]) return;

    try {
      await redeemNoMutation.mutateAsync({
        marketId,
        vaultId,
        tokenId: position.noTokens[0].id,
        tokenType: 'no',
      });
    } catch (err) {
      console.error('Failed to redeem NO:', err);
    }
  };

  const handleRedeemVoided = async () => {
    if (!vaultId || !position?.yesTokens[0] || !position?.noTokens[0]) return;

    try {
      await redeemVoidedMutation.mutateAsync({
        marketId,
        vaultId,
        yesTokenId: position.yesTokens[0].id,
        noTokenId: position.noTokens[0].id,
      });
    } catch (err) {
      console.error('Failed to redeem voided:', err);
    }
  };

  const handleConsolidate = async () => {
    if (!position) return;

    setConsolidateError(null);

    try {
      await consolidateAll(position.yesTokens, position.noTokens);
    } catch (err: any) {
      console.error('Failed to consolidate:', err);
      setConsolidateError(err.message || 'Failed to consolidate tokens');
    }
  };

  const canRedeemYes = marketStatus === 'resolved' && marketOutcome === 'yes' && position.totalYesBalance > 0;
  const canRedeemNo = marketStatus === 'resolved' && marketOutcome === 'no' && position.totalNoBalance > 0;
  const canRedeemVoided = marketStatus === 'voided' && position.totalYesBalance > 0 && position.totalNoBalance > 0;
  const canConsolidate = marketStatus === 'open' && (position.yesTokens.length > 1 || position.noTokens.length > 1);

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-[var(--foreground)] mb-4">Your Position</h3>

      {/* Token Balances */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Y</span>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--foreground)]">YES Tokens</div>
              <div className="text-xs text-[var(--gray-500)]">{position.yesTokens.length} token(s)</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-green-600">
              {formatBalance(position.totalYesBalance)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--foreground)]">NO Tokens</div>
              <div className="text-xs text-[var(--gray-500)]">{position.noTokens.length} token(s)</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-red-600">
              {formatBalance(position.totalNoBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Estimated Value */}
      {position.estimatedValue !== undefined && position.estimatedValue > 0 && (
        <div className="p-3 bg-[var(--gray-50)] rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--gray-600)]">Guaranteed Value</span>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {formatBalance(position.estimatedValue)} SUI
            </span>
          </div>
          <p className="text-xs text-[var(--gray-500)] mt-1">
            Min of YES and NO (can always merge back)
          </p>
        </div>
      )}

      {/* Consolidate Button - shown when user has multiple tokens of same type */}
      {canConsolidate && (
        <div className="mb-4">
          <button
            onClick={handleConsolidate}
            disabled={isPending}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isConsolidating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Consolidating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                Consolidate Tokens
              </>
            )}
          </button>
          <p className="text-xs text-[var(--gray-500)] mt-1.5 text-center">
            Merge {position.yesTokens.length} YES and {position.noTokens.length} NO tokens into single tokens
          </p>
          {consolidateError && (
            <p className="text-xs text-red-500 mt-1 text-center">{consolidateError}</p>
          )}
        </div>
      )}

      {/* Redemption Actions */}
      {canRedeemYes && (
        <button
          onClick={handleRedeemYes}
          disabled={isPending}
          className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {redeemYesMutation.isPending ? 'Redeeming...' : 'Redeem YES Tokens'}
        </button>
      )}

      {canRedeemNo && (
        <button
          onClick={handleRedeemNo}
          disabled={isPending}
          className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {redeemNoMutation.isPending ? 'Redeeming...' : 'Redeem NO Tokens'}
        </button>
      )}

      {canRedeemVoided && (
        <button
          onClick={handleRedeemVoided}
          disabled={isPending}
          className="w-full py-2.5 bg-[var(--gray-600)] text-white rounded-lg font-medium hover:bg-[var(--gray-700)] transition-colors disabled:opacity-50"
        >
          {redeemVoidedMutation.isPending ? 'Redeeming...' : 'Redeem (Market Voided)'}
        </button>
      )}

      {/* Status Messages */}
      {marketStatus === 'resolved' && (
        <p className="text-xs text-[var(--gray-500)] mt-3 text-center">
          {marketOutcome === 'yes' && position.totalYesBalance > 0
            ? 'Your YES tokens won! Redeem them for SUI.'
            : marketOutcome === 'no' && position.totalNoBalance > 0
            ? 'Your NO tokens won! Redeem them for SUI.'
            : 'Your tokens did not win in this market.'}
        </p>
      )}

      {marketStatus === 'voided' && (
        <p className="text-xs text-[var(--gray-500)] mt-3 text-center">
          Market was voided. Redeem your tokens for full refund.
        </p>
      )}

      {marketStatus === 'open' && (
        <p className="text-xs text-[var(--gray-500)] mt-3 text-center">
          Use the Merge tab to convert tokens back to SUI.
        </p>
      )}
    </div>
  );
}

// Export the position data hook for use in parent components
export { useMarketPosition };
