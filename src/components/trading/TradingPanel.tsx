'use client';

import { useState } from 'react';
import {
  useMarketTradingInfo,
  useOrderBook,
  useLiquidityPool,
  useCreateOrderBook,
} from '@/lib/hooks/useTrading';
import OrderBookDisplay from './OrderBookDisplay';
import PlaceOrderForm from './PlaceOrderForm';
import SwapPanel from './SwapPanel';
import LiquidityPanel from './LiquidityPanel';
import MatchOrdersPanel from './MatchOrdersPanel';

type Tab = 'order' | 'swap' | 'liquidity' | 'match';

interface TradingPanelProps {
  marketId: string; // Object ID for display/params
  marketIdNum: number; // Numeric market_id for contract calls
  marketStatus: string;
  isConnected?: boolean;
  onConnect?: () => void;
}

export default function TradingPanel({
  marketId,
  marketIdNum,
  marketStatus,
  isConnected,
  onConnect,
}: TradingPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('swap');
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>();

  // Fetch trading infrastructure IDs
  const { orderBookId, poolId, isLoading: infoLoading } = useMarketTradingInfo(marketIdNum);

  // Fetch detailed data
  const { data: orderBook, isLoading: obLoading } = useOrderBook(orderBookId || undefined);
  const { data: pool, isLoading: poolLoading } = useLiquidityPool(poolId || undefined);

  // Create mutations
  const createOrderBook = useCreateOrderBook();

  const isMarketOpen = marketStatus === 'open';
  const isLoading = infoLoading || obLoading || poolLoading;

  // Handle price click from order book
  const handlePriceClick = (price: number) => {
    setSelectedPrice(price);
    setActiveTab('order');
  };

  // Calculate current price from pool
  const currentPrice = pool
    ? Math.round(pool.yesPricePercent)
    : orderBook?.midPrice
    ? Math.round(orderBook.midPrice / 100)
    : 50;

  if (!isMarketOpen) {
    return (
      <div className="card p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">Trading</h3>
        <div className="text-center py-8 text-[var(--gray-500)]">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-[var(--gray-300)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-sm">Trading is not available</p>
          <p className="text-xs mt-1">Market is {marketStatus}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 md:p-5">
      {/* Header with Price */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--gray-100)]">
        <h3 className="text-base font-semibold text-[var(--foreground)]">Trade</h3>
        <div className="text-right">
          <div className="text-xs text-[var(--gray-500)]">Current Price</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[var(--yes-green)]">{currentPrice}%</span>
            <span className="text-xs text-[var(--gray-400)]">YES</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-lg mb-4">
        <button
          onClick={() => setActiveTab('swap')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === 'swap'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Swap
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === 'order'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Order
        </button>
        <button
          onClick={() => setActiveTab('liquidity')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === 'liquidity'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Liquidity
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === 'match'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
          }`}
        >
          Match
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-[var(--gray-100)] rounded" />
            <div className="h-32 bg-[var(--gray-100)] rounded" />
            <div className="h-10 bg-[var(--gray-100)] rounded" />
          </div>
        </div>
      )}

      {/* Tab Content */}
      {!isLoading && (
        <>
          {activeTab === 'swap' && (
            <SwapPanel
              marketId={marketId}
              poolId={poolId || undefined}
              isConnected={isConnected}
              onConnect={onConnect}
            />
          )}

          {activeTab === 'order' && (
            <div className="space-y-4">
              {/* Order Book Display */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-[var(--gray-700)]">Order Book</h4>
                  {!orderBookId && isConnected && (
                    <button
                      onClick={() => createOrderBook.mutate(marketIdNum)}
                      disabled={createOrderBook.isPending}
                      className="text-xs px-2 py-1 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-hover)] disabled:opacity-50"
                    >
                      {createOrderBook.isPending ? 'Creating...' : 'Create'}
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <OrderBookDisplay
                    orderBook={orderBook ?? undefined}
                    isLoading={obLoading}
                    onPriceClick={handlePriceClick}
                  />
                </div>
              </div>

              {/* Order Form */}
              <div className="pt-4 border-t border-[var(--gray-100)]">
                <h4 className="text-sm font-medium text-[var(--gray-700)] mb-3">Place Order</h4>
                <PlaceOrderForm
                  marketId={marketId}
                  orderBookId={orderBookId || undefined}
                  onConnect={onConnect}
                  defaultPrice={selectedPrice}
                  onOrderPlaced={() => setSelectedPrice(undefined)}
                />
              </div>
            </div>
          )}

          {activeTab === 'liquidity' && (
            <LiquidityPanel
              marketId={marketId}
              marketIdNum={marketIdNum}
              poolId={poolId || undefined}
              isConnected={isConnected}
              onConnect={onConnect}
            />
          )}

          {activeTab === 'match' && (
            <MatchOrdersPanel
              marketId={marketIdNum}
              onConnect={onConnect}
            />
          )}
        </>
      )}

      {/* Info Footer */}
      <div className="mt-4 pt-3 border-t border-[var(--gray-100)]">
        <div className="flex justify-between text-xs text-[var(--gray-500)]">
          <span>
            Order Book: {orderBookId ? '✓' : '✗'}
          </span>
          <span>
            Pool: {poolId ? '✓' : '✗'}
          </span>
        </div>
      </div>
    </div>
  );
}
