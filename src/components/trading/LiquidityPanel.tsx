'use client';

import { useState, useEffect } from 'react';
import {
  useLiquidityPool,
  useAddLiquidity,
  useRemoveLiquidity,
  useUserLPTokens,
  useCreateLiquidityPool,
} from '@/lib/hooks/useTrading';
import { useTokensForMarket } from '@/lib/hooks/useTokens';

interface LiquidityPanelProps {
  marketId: string;
  marketIdNum: number;
  poolId: string | undefined;
  isConnected?: boolean;
  onConnect?: () => void;
}

const MIST_PER_SUI = 1_000_000_000;

function formatSui(mist: number): string {
  const sui = mist / MIST_PER_SUI;
  if (sui >= 1000) return `${(sui / 1000).toFixed(2)}K`;
  if (sui >= 1) return sui.toFixed(4);
  return sui.toFixed(6);
}

type Mode = 'add' | 'remove';

export default function LiquidityPanel({
  marketId,
  marketIdNum,
  poolId,
  isConnected,
  onConnect,
}: LiquidityPanelProps) {
  const [mode, setMode] = useState<Mode>('add');
  const [selectedYesTokenId, setSelectedYesTokenId] = useState<string>('');
  const [selectedNoTokenId, setSelectedNoTokenId] = useState<string>('');
  const [selectedLpTokenId, setSelectedLpTokenId] = useState<string>('');

  // Hooks
  const { data: pool, isLoading: poolLoading } = useLiquidityPool(poolId);
  const { data: tokens } = useTokensForMarket(marketId);
  const { data: lpTokens } = useUserLPTokens(marketIdNum);
  const addLiquidityMutation = useAddLiquidity();
  const removeLiquidityMutation = useRemoveLiquidity();
  const createPoolMutation = useCreateLiquidityPool();

  const userYesTokens = tokens?.yesTokens || [];
  const userNoTokens = tokens?.noTokens || [];
  const userLpTokens = lpTokens || [];

  // Auto-select tokens
  useEffect(() => {
    if (mode === 'add') {
      if (userYesTokens.length > 0 && !selectedYesTokenId) {
        setSelectedYesTokenId(userYesTokens[0].id);
      }
      if (userNoTokens.length > 0 && !selectedNoTokenId) {
        setSelectedNoTokenId(userNoTokens[0].id);
      }
    } else {
      if (userLpTokens.length > 0 && !selectedLpTokenId) {
        setSelectedLpTokenId(userLpTokens[0].id);
      }
    }
  }, [mode, userYesTokens, userNoTokens, userLpTokens, selectedYesTokenId, selectedNoTokenId, selectedLpTokenId]);

  const selectedYesToken = userYesTokens.find((t) => t.id === selectedYesTokenId);
  const selectedNoToken = userNoTokens.find((t) => t.id === selectedNoTokenId);
  const selectedLpToken = userLpTokens.find((t) => t.id === selectedLpTokenId);

  const handleCreatePool = async () => {
    try {
      await createPoolMutation.mutateAsync(marketIdNum);
    } catch (error) {
      console.error('Failed to create pool:', error);
    }
  };

  const handleAddLiquidity = async () => {
    if (!poolId || !selectedYesTokenId || !selectedNoTokenId) return;

    try {
      await addLiquidityMutation.mutateAsync({
        marketId,
        poolId,
        yesTokenId: selectedYesTokenId,
        noTokenId: selectedNoTokenId,
      });

      // Reset selections
      setSelectedYesTokenId('');
      setSelectedNoTokenId('');
    } catch (error) {
      console.error('Failed to add liquidity:', error);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!poolId || !selectedLpTokenId) return;

    try {
      await removeLiquidityMutation.mutateAsync({
        marketId,
        poolId,
        lpTokenId: selectedLpTokenId,
      });

      // Reset selection
      setSelectedLpTokenId('');
    } catch (error) {
      console.error('Failed to remove liquidity:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[var(--gray-500)] mb-4">
          Connect wallet to manage liquidity
        </p>
        <button
          onClick={onConnect}
          className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (poolLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-[var(--gray-100)] rounded-lg" />
        <div className="h-32 bg-[var(--gray-100)] rounded-lg" />
      </div>
    );
  }

  // No pool exists - show create button
  if (!poolId || !pool) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[var(--gray-500)] mb-4">
          No liquidity pool exists for this market
        </p>
        <button
          onClick={handleCreatePool}
          disabled={createPoolMutation.isPending}
          className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
        >
          {createPoolMutation.isPending ? 'Creating...' : 'Create Liquidity Pool'}
        </button>
        {createPoolMutation.error && (
          <p className="text-xs text-[var(--danger)] mt-2">
            {createPoolMutation.error.message || 'Failed to create pool'}
          </p>
        )}
      </div>
    );
  }

  const isPending = addLiquidityMutation.isPending || removeLiquidityMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Pool Stats */}
      <div className="p-4 bg-[var(--gray-50)] rounded-xl">
        <div className="text-sm font-medium text-[var(--foreground)] mb-3">Pool Reserves</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[var(--gray-500)]">YES Reserve</div>
            <div className="text-lg font-semibold text-[var(--yes-green)]">
              {pool.yesReserveFormatted}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--gray-500)]">NO Reserve</div>
            <div className="text-lg font-semibold text-[var(--no-red)]">
              {pool.noReserveFormatted}
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--gray-200)]">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--gray-500)]">Total LP Tokens</span>
            <span className="text-[var(--foreground)]">{formatSui(pool.totalLpTokens)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-[var(--gray-500)]">Fees Collected</span>
            <span className="text-[var(--foreground)]">{pool.totalFeesFormatted}</span>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-lg">
        <button
          type="button"
          onClick={() => setMode('add')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            mode === 'add'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Add Liquidity
        </button>
        <button
          type="button"
          onClick={() => setMode('remove')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            mode === 'remove'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Remove
        </button>
      </div>

      {mode === 'add' ? (
        <div className="space-y-4">
          {/* YES Token Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              YES Token
            </label>
            {userYesTokens.length > 0 ? (
              <select
                value={selectedYesTokenId}
                onChange={(e) => setSelectedYesTokenId(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Select YES token</option>
                {userYesTokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.balanceFormatted} ({token.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[var(--gray-500)] py-2">
                No YES tokens available. Mint tokens first.
              </p>
            )}
          </div>

          {/* NO Token Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              NO Token
            </label>
            {userNoTokens.length > 0 ? (
              <select
                value={selectedNoTokenId}
                onChange={(e) => setSelectedNoTokenId(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Select NO token</option>
                {userNoTokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.balanceFormatted} ({token.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[var(--gray-500)] py-2">
                No NO tokens available. Mint tokens first.
              </p>
            )}
          </div>

          {/* Summary */}
          {selectedYesToken && selectedNoToken && (
            <div className="p-3 bg-[var(--gray-50)] rounded-lg text-sm">
              <div className="text-xs text-[var(--gray-500)] mb-2">You will deposit:</div>
              <div className="flex justify-between">
                <span className="text-[var(--yes-green)]">{selectedYesToken.balanceFormatted}</span>
                <span className="text-[var(--gray-400)]">+</span>
                <span className="text-[var(--no-red)]">{selectedNoToken.balanceFormatted}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleAddLiquidity}
            disabled={isPending || !selectedYesTokenId || !selectedNoTokenId}
            className={`w-full py-3 rounded-xl text-base font-semibold transition-colors ${
              isPending
                ? 'bg-[var(--gray-300)] text-[var(--gray-500)] cursor-wait'
                : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending ? 'Adding...' : 'Add Liquidity'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* LP Token Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              LP Token
            </label>
            {userLpTokens.length > 0 ? (
              <select
                value={selectedLpTokenId}
                onChange={(e) => setSelectedLpTokenId(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Select LP token</option>
                {userLpTokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.amountFormatted} ({token.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[var(--gray-500)] py-2">
                No LP tokens. Add liquidity first.
              </p>
            )}
          </div>

          {/* Estimated Output */}
          {selectedLpToken && pool && (
            <div className="p-3 bg-[var(--gray-50)] rounded-lg text-sm">
              <div className="text-xs text-[var(--gray-500)] mb-2">Estimated output:</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--gray-600)]">YES tokens</span>
                  <span className="text-[var(--yes-green)]">
                    ~{formatSui((selectedLpToken.amount / pool.totalLpTokens) * pool.yesReserve)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--gray-600)]">NO tokens</span>
                  <span className="text-[var(--no-red)]">
                    ~{formatSui((selectedLpToken.amount / pool.totalLpTokens) * pool.noReserve)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRemoveLiquidity}
            disabled={isPending || !selectedLpTokenId}
            className={`w-full py-3 rounded-xl text-base font-semibold transition-colors ${
              isPending
                ? 'bg-[var(--gray-300)] text-[var(--gray-500)] cursor-wait'
                : 'bg-[var(--danger)] text-white hover:opacity-90'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending ? 'Removing...' : 'Remove Liquidity'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {(addLiquidityMutation.error || removeLiquidityMutation.error) && (
        <p className="text-xs text-[var(--danger)] text-center">
          {(addLiquidityMutation.error || removeLiquidityMutation.error)?.message || 'Operation failed'}
        </p>
      )}
    </div>
  );
}
