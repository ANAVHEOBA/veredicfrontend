'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { usePlaceBuyOrder, usePlaceSellOrder, useOrderBook } from '@/lib/hooks/useTrading';
import { useTokensForMarket } from '@/lib/hooks/useTokens';
import type { OrderOutcome } from '@/types/trading';

interface PlaceOrderFormProps {
  marketId: string;
  orderBookId: string | undefined;
  onConnect?: () => void;
  defaultPrice?: number;
  onOrderPlaced?: () => void;
}

const MIST_PER_SUI = 1_000_000_000;

function formatSui(mist: number): string {
  return (mist / MIST_PER_SUI).toFixed(4);
}

export default function PlaceOrderForm({
  marketId,
  orderBookId,
  onConnect,
  defaultPrice,
  onOrderPlaced,
}: PlaceOrderFormProps) {
  const account = useCurrentAccount();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [outcome, setOutcome] = useState<OrderOutcome>('yes');
  const [price, setPrice] = useState<string>(defaultPrice ? (defaultPrice / 100).toString() : '50');
  const [amount, setAmount] = useState<string>('');
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');

  // Hooks
  const { data: orderBook } = useOrderBook(orderBookId);
  const { data: tokens } = useTokensForMarket(marketId);
  const placeBuyOrder = usePlaceBuyOrder();
  const placeSellOrder = usePlaceSellOrder();

  const isPending = placeBuyOrder.isPending || placeSellOrder.isPending;

  // Update price when defaultPrice changes
  useEffect(() => {
    if (defaultPrice) {
      setPrice((defaultPrice / 100).toString());
    }
  }, [defaultPrice]);

  // Get user's tokens for selling
  const userYesTokens = tokens?.yesTokens || [];
  const userNoTokens = tokens?.noTokens || [];
  const relevantTokens = outcome === 'yes' ? userYesTokens : userNoTokens;

  // Auto-select first token when switching outcome
  useEffect(() => {
    if (side === 'sell' && relevantTokens.length > 0 && !selectedTokenId) {
      setSelectedTokenId(relevantTokens[0].id);
    }
  }, [side, outcome, relevantTokens, selectedTokenId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderBookId || !account?.address) return;

    const priceNum = parseFloat(price);
    const amountNum = parseFloat(amount);

    if (isNaN(priceNum) || isNaN(amountNum) || priceNum <= 0 || priceNum >= 100 || amountNum <= 0) {
      return;
    }

    const priceBps = Math.round(priceNum * 100); // Convert percentage to basis points
    const amountMist = Math.round(amountNum * MIST_PER_SUI);

    try {
      if (side === 'buy') {
        await placeBuyOrder.mutateAsync({
          marketId,
          orderBookId,
          outcome,
          price: priceBps,
          amount: amountMist,
        });
      } else {
        if (!selectedTokenId) return;
        await placeSellOrder.mutateAsync({
          marketId,
          orderBookId,
          tokenId: selectedTokenId,
          outcome,
          price: priceBps,
        });
      }

      // Reset form
      setAmount('');
      onOrderPlaced?.();
    } catch (error) {
      console.error('Failed to place order:', error);
    }
  };

  // Calculate potential shares (for buy) or potential return (for sell)
  const priceNum = parseFloat(price) || 50;
  const amountNum = parseFloat(amount) || 0;
  const priceBps = priceNum * 100;

  const potentialShares = side === 'buy'
    ? (amountNum * MIST_PER_SUI) / (priceBps / 10000)
    : 0;

  const selectedToken = relevantTokens.find((t) => t.id === selectedTokenId);
  const potentialReturn = side === 'sell' && selectedToken
    ? selectedToken.balance * (priceBps / 10000)
    : 0;

  if (!account?.address) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[var(--gray-500)] mb-4">
          Connect wallet to place orders
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

  if (!orderBookId) {
    return (
      <div className="text-center py-6 text-[var(--gray-500)]">
        <p className="text-sm">No order book available</p>
        <p className="text-xs mt-1">Order book needs to be created first</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Buy/Sell Toggle */}
      <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-lg">
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            side === 'buy'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            side === 'sell'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Outcome Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOutcome('yes')}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
            outcome === 'yes'
              ? 'bg-[var(--yes-green)] text-white'
              : 'bg-[var(--yes-green-bg)] text-[var(--yes-green)] hover:bg-[var(--yes-green)] hover:text-white'
          }`}
        >
          YES
        </button>
        <button
          type="button"
          onClick={() => setOutcome('no')}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
            outcome === 'no'
              ? 'bg-[var(--no-red)] text-white'
              : 'bg-[var(--no-red-bg)] text-[var(--no-red)] hover:bg-[var(--no-red)] hover:text-white'
          }`}
        >
          NO
        </button>
      </div>

      {/* Price Input */}
      <div>
        <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
          Price (%)
        </label>
        <div className="relative">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0.01"
            max="99.99"
            step="0.01"
            className="w-full px-3 py-2 pr-8 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
            placeholder="50.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)] text-sm">
            %
          </span>
        </div>
        <div className="flex gap-2 mt-2">
          {[25, 50, 75].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrice(p.toString())}
              className="flex-1 py-1 text-xs rounded bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]"
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input (for buy) or Token Selection (for sell) */}
      {side === 'buy' ? (
        <div>
          <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
            Amount (SUI)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
            placeholder="0.00"
          />
          <div className="flex gap-2 mt-2">
            {[0.1, 0.5, 1, 5].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a.toString())}
                className="flex-1 py-1 text-xs rounded bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]"
              >
                {a} SUI
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
            Token to Sell
          </label>
          {relevantTokens.length > 0 ? (
            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
            >
              {relevantTokens.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.balanceFormatted} ({token.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-[var(--gray-500)] py-2">
              No {outcome.toUpperCase()} tokens to sell
            </p>
          )}
        </div>
      )}

      {/* Order Summary */}
      <div className="p-3 bg-[var(--gray-50)] rounded-lg text-sm space-y-1">
        {side === 'buy' && amountNum > 0 && (
          <>
            <div className="flex justify-between text-[var(--gray-600)]">
              <span>You pay</span>
              <span>{amountNum.toFixed(4)} SUI</span>
            </div>
            <div className="flex justify-between text-[var(--foreground)] font-medium">
              <span>You receive</span>
              <span>{formatSui(potentialShares)} {outcome.toUpperCase()}</span>
            </div>
          </>
        )}
        {side === 'sell' && selectedToken && (
          <>
            <div className="flex justify-between text-[var(--gray-600)]">
              <span>You sell</span>
              <span>{selectedToken.balanceFormatted}</span>
            </div>
            <div className="flex justify-between text-[var(--foreground)] font-medium">
              <span>You receive</span>
              <span>{formatSui(potentialReturn)} SUI</span>
            </div>
          </>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={
          isPending ||
          (side === 'buy' && (!amount || parseFloat(amount) <= 0)) ||
          (side === 'sell' && !selectedTokenId)
        }
        className={`w-full py-3 rounded-xl text-base font-semibold transition-colors ${
          isPending
            ? 'bg-[var(--gray-300)] text-[var(--gray-500)] cursor-wait'
            : outcome === 'yes'
            ? 'bg-[var(--yes-green)] text-white hover:opacity-90'
            : 'bg-[var(--no-red)] text-white hover:opacity-90'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPending
          ? 'Processing...'
          : `${side === 'buy' ? 'Buy' : 'Sell'} ${outcome.toUpperCase()}`}
      </button>

      {/* Error Display */}
      {(placeBuyOrder.error || placeSellOrder.error) && (
        <p className="text-xs text-[var(--danger)] text-center">
          {(placeBuyOrder.error || placeSellOrder.error)?.message || 'Failed to place order'}
        </p>
      )}
    </form>
  );
}
