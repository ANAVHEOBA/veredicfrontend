'use client';

import { useMemo } from 'react';
import type { OrderBook, OrderBookLevel } from '@/types/trading';

interface OrderBookDisplayProps {
  orderBook: OrderBook | undefined;
  isLoading?: boolean;
  onPriceClick?: (price: number) => void;
}

function formatPrice(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

function formatAmount(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (sui >= 1000) return `${(sui / 1000).toFixed(1)}K`;
  if (sui >= 1) return sui.toFixed(2);
  return sui.toFixed(4);
}

// Aggregate orders by price level
function aggregateByPrice(orders: { price: number; remaining: number }[]): OrderBookLevel[] {
  const priceMap = new Map<number, { total: number; count: number }>();

  for (const order of orders) {
    const existing = priceMap.get(order.price);
    if (existing) {
      existing.total += order.remaining;
      existing.count += 1;
    } else {
      priceMap.set(order.price, { total: order.remaining, count: 1 });
    }
  }

  return Array.from(priceMap.entries()).map(([price, { total, count }]) => ({
    price,
    pricePercent: price / 100,
    totalAmount: total,
    totalAmountFormatted: formatAmount(total),
    orderCount: count,
  }));
}

export default function OrderBookDisplay({
  orderBook,
  isLoading,
  onPriceClick,
}: OrderBookDisplayProps) {
  // Aggregate buy and sell orders
  const { buyLevels, sellLevels, maxAmount } = useMemo(() => {
    if (!orderBook) {
      return { buyLevels: [], sellLevels: [], maxAmount: 0 };
    }

    const buyLevels = aggregateByPrice(orderBook.buyOrders)
      .sort((a, b) => b.price - a.price)
      .slice(0, 10);

    const sellLevels = aggregateByPrice(orderBook.sellOrders)
      .sort((a, b) => a.price - b.price)
      .slice(0, 10);

    const maxAmount = Math.max(
      ...buyLevels.map((l) => l.totalAmount),
      ...sellLevels.map((l) => l.totalAmount),
      1
    );

    return { buyLevels, sellLevels, maxAmount };
  }, [orderBook]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-6 bg-[var(--gray-100)] rounded" />
        ))}
      </div>
    );
  }

  if (!orderBook) {
    return (
      <div className="text-center py-8 text-[var(--gray-500)]">
        <p className="text-sm">No order book available</p>
        <p className="text-xs mt-1">Create an order book to start trading</p>
      </div>
    );
  }

  const hasOrders = buyLevels.length > 0 || sellLevels.length > 0;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-3 text-xs text-[var(--gray-500)] px-2 pb-1 border-b border-[var(--gray-100)]">
        <div>Price</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      {/* Sell orders (reversed to show lowest at bottom) */}
      <div className="space-y-0.5">
        {sellLevels.length > 0 ? (
          [...sellLevels].reverse().map((level) => (
            <div
              key={`sell-${level.price}`}
              className="relative grid grid-cols-3 text-xs py-1 px-2 cursor-pointer hover:bg-[var(--gray-50)] rounded"
              onClick={() => onPriceClick?.(level.price)}
            >
              {/* Background bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-[var(--no-red-bg)] opacity-50 rounded-r"
                style={{ width: `${(level.totalAmount / maxAmount) * 100}%` }}
              />
              <div className="relative text-[var(--no-red)] font-medium">
                {formatPrice(level.price)}
              </div>
              <div className="relative text-right text-[var(--foreground)]">
                {level.totalAmountFormatted}
              </div>
              <div className="relative text-right text-[var(--gray-500)]">
                {level.orderCount}
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-center text-[var(--gray-400)] py-2">
            No sell orders
          </div>
        )}
      </div>

      {/* Spread indicator */}
      <div className="flex items-center justify-between px-2 py-1 bg-[var(--gray-50)] rounded text-xs">
        <span className="text-[var(--gray-500)]">Spread</span>
        <span className="font-medium text-[var(--foreground)]">
          {orderBook.spread !== null ? formatPrice(orderBook.spread) : '-'}
        </span>
      </div>

      {/* Buy orders */}
      <div className="space-y-0.5">
        {buyLevels.length > 0 ? (
          buyLevels.map((level) => (
            <div
              key={`buy-${level.price}`}
              className="relative grid grid-cols-3 text-xs py-1 px-2 cursor-pointer hover:bg-[var(--gray-50)] rounded"
              onClick={() => onPriceClick?.(level.price)}
            >
              {/* Background bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-[var(--yes-green-bg)] opacity-50 rounded-r"
                style={{ width: `${(level.totalAmount / maxAmount) * 100}%` }}
              />
              <div className="relative text-[var(--yes-green)] font-medium">
                {formatPrice(level.price)}
              </div>
              <div className="relative text-right text-[var(--foreground)]">
                {level.totalAmountFormatted}
              </div>
              <div className="relative text-right text-[var(--gray-500)]">
                {level.orderCount}
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-center text-[var(--gray-400)] py-2">
            No buy orders
          </div>
        )}
      </div>

      {/* Stats */}
      {hasOrders && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--gray-100)] text-xs">
          <div className="text-[var(--gray-500)]">
            Best Bid: <span className="text-[var(--yes-green)] font-medium">
              {orderBook.bestBid ? formatPrice(orderBook.bestBid) : '-'}
            </span>
          </div>
          <div className="text-right text-[var(--gray-500)]">
            Best Ask: <span className="text-[var(--no-red)] font-medium">
              {orderBook.bestAsk ? formatPrice(orderBook.bestAsk) : '-'}
            </span>
          </div>
        </div>
      )}

      {/* Volume info */}
      <div className="flex justify-between text-xs text-[var(--gray-500)] pt-2">
        <span>Volume: {orderBook.totalVolumeFormatted}</span>
        <span>Trades: {orderBook.tradeCount}</span>
      </div>
    </div>
  );
}
