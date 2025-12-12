'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  useLiquidityPool,
  useSwapQuote,
  useSwap,
} from '@/lib/hooks/useTrading';
import { useTokensForMarket } from '@/lib/hooks/useTokens';
import type { OrderOutcome } from '@/types/trading';

interface SwapPanelProps {
  marketId: string;
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

export default function SwapPanel({
  marketId,
  poolId,
  isConnected,
  onConnect,
}: SwapPanelProps) {
  const account = useCurrentAccount();
  const [inputOutcome, setInputOutcome] = useState<OrderOutcome>('yes');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [slippageBps, setSlippageBps] = useState<number>(100); // 1% default
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');

  // Hooks
  const { data: pool, isLoading: poolLoading } = useLiquidityPool(poolId);
  const { data: tokens } = useTokensForMarket(marketId);
  const swapMutation = useSwap();

  const inputAmountNum = parseFloat(inputAmount) || 0;
  const inputAmountMist = inputAmountNum * MIST_PER_SUI;

  const { data: quote, isLoading: quoteLoading } = useSwapQuote(
    poolId,
    inputAmountMist,
    inputOutcome,
    slippageBps
  );

  // Get user tokens
  const userYesTokens = tokens?.yesTokens || [];
  const userNoTokens = tokens?.noTokens || [];
  const relevantTokens = inputOutcome === 'yes' ? userYesTokens : userNoTokens;

  // Auto-select first token when outcome changes
  useEffect(() => {
    if (relevantTokens.length > 0 && !selectedTokenId) {
      setSelectedTokenId(relevantTokens[0].id);
    }
  }, [inputOutcome, relevantTokens, selectedTokenId]);

  // Reset token selection when outcome changes
  useEffect(() => {
    const newTokens = inputOutcome === 'yes' ? userYesTokens : userNoTokens;
    if (newTokens.length > 0) {
      setSelectedTokenId(newTokens[0].id);
    } else {
      setSelectedTokenId('');
    }
  }, [inputOutcome, userYesTokens, userNoTokens]);

  const outputOutcome = inputOutcome === 'yes' ? 'no' : 'yes';
  const selectedToken = relevantTokens.find((t) => t.id === selectedTokenId);
  const maxInput = selectedToken ? selectedToken.balance / MIST_PER_SUI : 0;

  const handleSwap = async () => {
    if (!poolId || !selectedTokenId || !quote) return;

    try {
      await swapMutation.mutateAsync({
        marketId,
        poolId,
        tokenId: selectedTokenId,
        inputOutcome,
        minOutput: quote.minOutput,
      });

      // Reset form
      setInputAmount('');
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  const handleFlipDirection = () => {
    setInputOutcome(outputOutcome);
    setInputAmount('');
    setSelectedTokenId('');
  };

  if (!isConnected) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[var(--gray-500)] mb-4">
          Connect wallet to swap tokens
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
        <div className="h-24 bg-[var(--gray-100)] rounded-lg" />
        <div className="h-10 bg-[var(--gray-100)] rounded-lg" />
        <div className="h-24 bg-[var(--gray-100)] rounded-lg" />
      </div>
    );
  }

  if (!poolId || !pool) {
    return (
      <div className="text-center py-6 text-[var(--gray-500)]">
        <p className="text-sm">No liquidity pool available</p>
        <p className="text-xs mt-1">Create a pool to enable swaps</p>
      </div>
    );
  }

  if (!pool.isActive) {
    return (
      <div className="text-center py-6 text-[var(--gray-500)]">
        <p className="text-sm">Pool is inactive</p>
        <p className="text-xs mt-1">Trading has been paused</p>
      </div>
    );
  }

  // Check if pool has liquidity
  const hasLiquidity = pool.yesReserve > 0 && pool.noReserve > 0;

  if (!hasLiquidity) {
    return (
      <div className="text-center py-6 text-[var(--gray-500)]">
        <p className="text-sm">Pool has no liquidity</p>
        <p className="text-xs mt-1">Add liquidity to enable swaps</p>
        <p className="text-xs mt-3 text-[var(--gray-400)]">
          Go to the Liquidity tab to add YES + NO tokens
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="p-4 bg-[var(--gray-50)] rounded-xl">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-[var(--gray-500)]">You pay</span>
          <span className="text-xs text-[var(--gray-500)]">
            Balance: {maxInput.toFixed(4)} {inputOutcome.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-3">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            min="0"
            max={maxInput}
            step="0.0001"
            className="flex-1 bg-transparent text-2xl font-semibold text-[var(--foreground)] focus:outline-none"
          />
          <div
            className={`px-4 py-2 rounded-lg font-semibold ${
              inputOutcome === 'yes'
                ? 'bg-[var(--yes-green-bg)] text-[var(--yes-green)]'
                : 'bg-[var(--no-red-bg)] text-[var(--no-red)]'
            }`}
          >
            {inputOutcome.toUpperCase()}
          </div>
        </div>
        {relevantTokens.length > 1 && (
          <select
            value={selectedTokenId}
            onChange={(e) => setSelectedTokenId(e.target.value)}
            className="mt-2 w-full text-xs px-2 py-1 border border-[var(--gray-200)] rounded bg-white"
          >
            {relevantTokens.map((token) => (
              <option key={token.id} value={token.id}>
                {token.balanceFormatted} ({token.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2 mt-2">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setInputAmount((maxInput * pct / 100).toFixed(4))}
              className="flex-1 py-1 text-xs rounded bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]"
              disabled={maxInput === 0}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          type="button"
          onClick={handleFlipDirection}
          className="w-10 h-10 rounded-full bg-white border-4 border-[var(--gray-50)] flex items-center justify-center hover:bg-[var(--gray-100)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 10l5-5 5 5" />
            <path d="M7 14l5 5 5-5" />
          </svg>
        </button>
      </div>

      {/* Output Section */}
      <div className="p-4 bg-[var(--gray-50)] rounded-xl">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-[var(--gray-500)]">You receive</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 text-2xl font-semibold text-[var(--foreground)]">
            {quoteLoading ? (
              <span className="text-[var(--gray-400)]">...</span>
            ) : quote ? (
              formatSui(quote.outputAmount)
            ) : (
              '0.0'
            )}
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-semibold ${
              outputOutcome === 'yes'
                ? 'bg-[var(--yes-green-bg)] text-[var(--yes-green)]'
                : 'bg-[var(--no-red-bg)] text-[var(--no-red)]'
            }`}
          >
            {outputOutcome.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Swap Details */}
      {quote && inputAmountNum > 0 && !isNaN(quote.priceImpact) && (
        <div className="p-3 bg-[var(--gray-50)] rounded-lg text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">Rate</span>
            <span className="text-[var(--foreground)]">
              1 {inputOutcome.toUpperCase()} = {inputAmountMist > 0 ? (quote.outputAmount / inputAmountMist).toFixed(4) : '0'} {outputOutcome.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">Price Impact</span>
            <span className={quote.priceImpact > 5 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'}>
              {isNaN(quote.priceImpact) ? '0.00' : quote.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">Fee (0.3%)</span>
            <span className="text-[var(--foreground)]">{quote.feeAmountFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">Min. Received</span>
            <span className="text-[var(--foreground)]">{formatSui(quote.minOutput)} {outputOutcome.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Slippage Setting */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--gray-500)]">Slippage Tolerance</span>
        <div className="flex gap-1">
          {[50, 100, 200].map((bps) => (
            <button
              key={bps}
              type="button"
              onClick={() => setSlippageBps(bps)}
              className={`px-2 py-1 rounded ${
                slippageBps === bps
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]'
              }`}
            >
              {bps / 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Pool Info */}
      <div className="text-xs text-[var(--gray-500)] text-center">
        Pool: {formatSui(pool.yesReserve)} YES / {formatSui(pool.noReserve)} NO
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={
          swapMutation.isPending ||
          !selectedTokenId ||
          inputAmountNum <= 0 ||
          inputAmountNum > maxInput ||
          !quote
        }
        className={`w-full py-3 rounded-xl text-base font-semibold transition-colors ${
          swapMutation.isPending
            ? 'bg-[var(--gray-300)] text-[var(--gray-500)] cursor-wait'
            : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {swapMutation.isPending
          ? 'Swapping...'
          : relevantTokens.length === 0
          ? `No ${inputOutcome.toUpperCase()} tokens`
          : inputAmountNum > maxInput
          ? 'Insufficient balance'
          : 'Swap'}
      </button>

      {/* Error Display */}
      {swapMutation.error && (
        <p className="text-xs text-[var(--danger)] text-center">
          {swapMutation.error.message || 'Swap failed'}
        </p>
      )}
    </div>
  );
}
