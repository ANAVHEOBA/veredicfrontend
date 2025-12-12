'use client';

import { useState, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  useOrderBook,
  useMatchOrders,
  useMarketTradingInfo,
} from '@/lib/hooks/useTrading';

interface MatchOrdersPanelProps {
  marketId: number | undefined;
  onConnect?: () => void;
}

const MIST_PER_SUI = 1_000_000_000;

function formatAmount(mist: number): string {
  const sui = mist / MIST_PER_SUI;
  if (sui >= 1000) return `${(sui / 1000).toFixed(2)}K`;
  if (sui >= 1) return sui.toFixed(4);
  return sui.toFixed(6);
}

function formatPrice(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface MatchableOrder {
  orderId: number;
  maker: string;
  side: 'buy' | 'sell';
  outcome: 'yes' | 'no';
  price: number;
  remaining: number;
}

interface MatchablePair {
  buyOrder: MatchableOrder;
  sellOrder: MatchableOrder;
  matchAmount: number;
  executionPrice: number;
}

export default function MatchOrdersPanel({ marketId, onConnect }: MatchOrdersPanelProps) {
  const account = useCurrentAccount();
  const { orderBookId } = useMarketTradingInfo(marketId);
  const { data: orderBook, isLoading, refetch } = useOrderBook(orderBookId || undefined);
  const matchMutation = useMatchOrders();

  const [matchingPair, setMatchingPair] = useState<{ buyId: number; sellId: number } | null>(null);

  // Find matchable order pairs
  const matchablePairs = useMemo<MatchablePair[]>(() => {
    if (!orderBook) return [];

    const pairs: MatchablePair[] = [];

    // Get open buy and sell orders
    const buyOrders = orderBook.buyOrders.filter(o => o.isOpen);
    const sellOrders = orderBook.sellOrders.filter(o => o.isOpen);

    // Find pairs where buy price >= sell price (can be matched)
    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        // Orders can match if:
        // 1. Same outcome
        // 2. Buy price >= Sell price
        if (buyOrder.outcome === sellOrder.outcome && buyOrder.price >= sellOrder.price) {
          const matchAmount = Math.min(buyOrder.remaining, sellOrder.remaining);
          // Execution price is typically the maker's price (the order that was there first)
          // For simplicity, we'll use the average
          const executionPrice = Math.floor((buyOrder.price + sellOrder.price) / 2);

          pairs.push({
            buyOrder: {
              orderId: buyOrder.orderId,
              maker: buyOrder.maker,
              side: 'buy',
              outcome: buyOrder.outcome,
              price: buyOrder.price,
              remaining: buyOrder.remaining,
            },
            sellOrder: {
              orderId: sellOrder.orderId,
              maker: sellOrder.maker,
              side: 'sell',
              outcome: sellOrder.outcome,
              price: sellOrder.price,
              remaining: sellOrder.remaining,
            },
            matchAmount,
            executionPrice,
          });
        }
      }
    }

    // Sort by profit opportunity (larger spread = more profit for matcher)
    pairs.sort((a, b) => {
      const spreadA = a.buyOrder.price - a.sellOrder.price;
      const spreadB = b.buyOrder.price - b.sellOrder.price;
      return spreadB - spreadA;
    });

    return pairs;
  }, [orderBook]);

  const handleMatch = async (buyOrderId: number, sellOrderId: number) => {
    if (!orderBookId) return;

    setMatchingPair({ buyId: buyOrderId, sellId: sellOrderId });
    try {
      await matchMutation.mutateAsync({
        orderBookId,
        buyOrderId,
        sellOrderId,
      });
      refetch();
    } catch (error) {
      console.error('Failed to match orders:', error);
    } finally {
      setMatchingPair(null);
    }
  };

  if (!account) {
    return (
      <div className="card p-4 md:p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
          Match Orders
        </h3>
        <div className="text-center py-6">
          <p className="text-sm text-[var(--gray-500)] mb-4">
            Connect wallet to match orders
          </p>
          <button
            onClick={onConnect}
            className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!orderBookId) {
    return (
      <div className="card p-4 md:p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
          Match Orders
        </h3>
        <div className="text-center py-6 text-[var(--gray-500)]">
          <p className="text-sm">No order book available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Match Orders
        </h3>
        <button
          onClick={() => refetch()}
          className="text-xs text-[var(--primary)] hover:underline"
        >
          Refresh
        </button>
      </div>

      <p className="text-xs text-[var(--gray-500)] mb-4">
        Match compatible buy and sell orders to earn the spread. Orders match when buy price &ge; sell price.
      </p>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-20 bg-[var(--gray-100)] rounded-lg" />
            ))}
          </div>
        ) : matchablePairs.length === 0 ? (
          <div className="text-center py-8 text-[var(--gray-500)]">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-[var(--gray-300)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <p className="text-sm">No matchable orders</p>
            <p className="text-xs text-[var(--gray-400)] mt-1">
              Orders will appear when buy price &ge; sell price
            </p>
          </div>
        ) : (
          matchablePairs.map((pair, index) => (
            <MatchPairRow
              key={`${pair.buyOrder.orderId}-${pair.sellOrder.orderId}`}
              pair={pair}
              onMatch={() => handleMatch(pair.buyOrder.orderId, pair.sellOrder.orderId)}
              isMatching={
                matchingPair?.buyId === pair.buyOrder.orderId &&
                matchingPair?.sellId === pair.sellOrder.orderId
              }
            />
          ))
        )}
      </div>

      {matchMutation.error && (
        <p className="text-xs text-[var(--danger)] text-center mt-3">
          {matchMutation.error.message || 'Failed to match orders'}
        </p>
      )}

      {matchablePairs.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--gray-100)]">
          <p className="text-xs text-[var(--gray-500)]">
            Found {matchablePairs.length} matchable pair{matchablePairs.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

interface MatchPairRowProps {
  pair: MatchablePair;
  onMatch: () => void;
  isMatching: boolean;
}

function MatchPairRow({ pair, onMatch, isMatching }: MatchPairRowProps) {
  const { buyOrder, sellOrder, matchAmount, executionPrice } = pair;
  const spread = buyOrder.price - sellOrder.price;
  const outcomeLabel = buyOrder.outcome.toUpperCase();
  const outcomeColor = buyOrder.outcome === 'yes' ? 'text-[var(--yes-green)]' : 'text-[var(--no-red)]';
  const outcomeBg = buyOrder.outcome === 'yes' ? 'bg-[var(--yes-green-bg)]' : 'bg-[var(--no-red-bg)]';

  return (
    <div className="p-3 bg-[var(--gray-50)] rounded-lg hover:bg-[var(--gray-100)] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className={`px-2 py-0.5 rounded text-xs font-semibold ${outcomeBg} ${outcomeColor}`}>
          {outcomeLabel}
        </div>
        <div className="text-xs text-[var(--gray-500)]">
          Spread: <span className="font-medium text-[var(--yes-green)]">{formatPrice(spread)}</span>
        </div>
      </div>

      {/* Orders */}
      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
        {/* Buy Order */}
        <div className="p-2 bg-white rounded border border-[var(--gray-200)]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[var(--yes-green)]">BUY</span>
            <span className="text-[var(--gray-500)]">#{buyOrder.orderId}</span>
          </div>
          <div className="text-[var(--foreground)]">
            {formatPrice(buyOrder.price)} @ {formatAmount(buyOrder.remaining)}
          </div>
          <div className="text-[var(--gray-400)] text-[10px] truncate">
            {shortenAddress(buyOrder.maker)}
          </div>
        </div>

        {/* Sell Order */}
        <div className="p-2 bg-white rounded border border-[var(--gray-200)]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[var(--no-red)]">SELL</span>
            <span className="text-[var(--gray-500)]">#{sellOrder.orderId}</span>
          </div>
          <div className="text-[var(--foreground)]">
            {formatPrice(sellOrder.price)} @ {formatAmount(sellOrder.remaining)}
          </div>
          <div className="text-[var(--gray-400)] text-[10px] truncate">
            {shortenAddress(sellOrder.maker)}
          </div>
        </div>
      </div>

      {/* Match Info & Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--gray-500)]">
          Match: {formatAmount(matchAmount)} @ {formatPrice(executionPrice)}
        </div>
        <button
          onClick={onMatch}
          disabled={isMatching}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isMatching
              ? 'bg-[var(--gray-200)] text-[var(--gray-500)] cursor-wait'
              : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
          }`}
        >
          {isMatching ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Matching...
            </span>
          ) : (
            'Match'
          )}
        </button>
      </div>
    </div>
  );
}
