'use client';

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  useUserOpenOrders,
  useCancelOrder,
  useMarketTradingInfo,
} from '@/lib/hooks/useTrading';

interface OpenOrdersPanelProps {
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

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface OpenOrder {
  order_id: string;
  market_id: string;
  side: number; // 0 = buy, 1 = sell
  outcome: number; // 0 = yes, 1 = no
  price: number;
  amount: number;
  timestamp: number;
}

export default function OpenOrdersPanel({ marketId, onConnect }: OpenOrdersPanelProps) {
  const account = useCurrentAccount();
  const { data: orders, isLoading, refetch } = useUserOpenOrders(marketId);
  const { orderBookId } = useMarketTradingInfo(marketId);
  const cancelMutation = useCancelOrder();

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Helper to convert timestamp to milliseconds
  const toMs = (ts: number) => {
    if (ts < 100000000000) return ts * 1000;
    return ts;
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!orderBookId) return;

    setCancellingOrderId(orderId);
    try {
      await cancelMutation.mutateAsync({
        orderBookId,
        orderId: Number(orderId),
      });
      refetch();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (!account) {
    return (
      <div className="card p-4 md:p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
          Open Orders
        </h3>
        <div className="text-center py-6">
          <p className="text-sm text-[var(--gray-500)] mb-4">
            Connect wallet to view your open orders
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

  // Transform orders
  const orderList: OpenOrder[] = (orders || []).map((order: any) => ({
    order_id: String(order.order_id || '0'),
    market_id: String(order.market_id || '0'),
    side: Number(order.side || 0),
    outcome: Number(order.outcome || 0),
    price: Number(order.price || 0),
    amount: Number(order.amount || 0),
    timestamp: toMs(Number(order.timestamp || 0)),
  }));

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Open Orders
        </h3>
        {orderList.length > 0 && (
          <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full">
            {orderList.length}
          </span>
        )}
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-2">
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-[var(--gray-100)] rounded w-3/4" />
                  <div className="h-2 bg-[var(--gray-100)] rounded w-1/2" />
                </div>
                <div className="w-16 h-7 bg-[var(--gray-100)] rounded" />
              </div>
            ))}
          </div>
        ) : orderList.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">No open orders</p>
            <p className="text-xs text-[var(--gray-400)] mt-1">
              Place an order to see it here
            </p>
          </div>
        ) : (
          orderList.map((order) => (
            <OrderRow
              key={order.order_id}
              order={order}
              onCancel={() => handleCancelOrder(order.order_id)}
              isCancelling={cancellingOrderId === order.order_id}
            />
          ))
        )}
      </div>

      {cancelMutation.error && (
        <p className="text-xs text-[var(--danger)] text-center mt-3">
          {cancelMutation.error.message || 'Failed to cancel order'}
        </p>
      )}
    </div>
  );
}

interface OrderRowProps {
  order: OpenOrder;
  onCancel: () => void;
  isCancelling: boolean;
}

function OrderRow({ order, onCancel, isCancelling }: OrderRowProps) {
  const sideLabel = order.side === 0 ? 'Buy' : 'Sell';
  const sideColor = order.side === 0 ? 'text-[var(--yes-green)]' : 'text-[var(--no-red)]';

  const outcomeLabel = order.outcome === 0 ? 'YES' : 'NO';
  const outcomeColor = order.outcome === 0 ? 'text-[var(--yes-green)]' : 'text-[var(--no-red)]';
  const outcomeBg = order.outcome === 0 ? 'bg-[var(--yes-green-bg)]' : 'bg-[var(--no-red-bg)]';

  const pricePercent = (order.price / 100).toFixed(1);

  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-[var(--gray-50)] rounded-lg transition-colors group">
      {/* Outcome Badge */}
      <div className={`px-2 py-1 rounded-md text-xs font-semibold ${outcomeBg} ${outcomeColor} flex-shrink-0`}>
        {outcomeLabel}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-sm">
          <span className={`font-semibold ${sideColor}`}>{sideLabel}</span>
          <span className="text-[var(--gray-500)]">@</span>
          <span className="font-medium text-[var(--foreground)]">{pricePercent}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--gray-500)]">
          <span>{formatAmount(order.amount)}</span>
          <span>·</span>
          <span>{formatTime(order.timestamp)}</span>
        </div>
      </div>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        disabled={isCancelling}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
          isCancelling
            ? 'bg-[var(--gray-200)] text-[var(--gray-500)] cursor-wait'
            : 'bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-red-50 hover:text-[var(--danger)] group-hover:bg-red-50 group-hover:text-[var(--danger)]'
        }`}
      >
        {isCancelling ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            ...
          </span>
        ) : (
          'Cancel'
        )}
      </button>
    </div>
  );
}
