'use client';

import { useUserOrderHistory } from '@/lib/hooks/useTrading';
import { useCurrentAccount } from '@mysten/dapp-kit';

interface UserOrderHistoryProps {
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

interface OrderEvent {
  order_id: string;
  market_id: string;
  maker: string;
  side: number; // 0 = buy, 1 = sell
  outcome: number; // 0 = yes, 1 = no
  price: number;
  amount: number;
  timestamp: number;
}

export default function UserOrderHistory({ onConnect }: UserOrderHistoryProps) {
  const account = useCurrentAccount();
  const { data: orders, isLoading } = useUserOrderHistory(50);

  if (!account) {
    return (
      <div className="card p-4 md:p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
          Your Orders
        </h3>
        <div className="text-center py-6">
          <p className="text-sm text-[var(--gray-500)] mb-4">
            Connect wallet to view your order history
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

  // Helper to convert timestamp to milliseconds
  const toMs = (ts: number) => {
    if (ts < 100000000000) return ts * 1000;
    return ts;
  };

  // Transform orders
  const orderList: OrderEvent[] = (orders || []).map((order: any) => ({
    order_id: order.order_id || '0',
    market_id: order.market_id || '0',
    maker: order.maker || '',
    side: Number(order.side || 0),
    outcome: Number(order.outcome || 0),
    price: Number(order.price || 0),
    amount: Number(order.amount || 0),
    timestamp: toMs(Number(order.timestamp || 0)),
  }));

  return (
    <div className="card p-4 md:p-5">
      <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
        Your Orders
      </h3>

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-2">
                <div className="w-8 h-8 bg-[var(--gray-100)] rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-[var(--gray-100)] rounded w-3/4" />
                  <div className="h-2 bg-[var(--gray-100)] rounded w-1/2" />
                </div>
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm">No orders yet</p>
            <p className="text-xs text-[var(--gray-400)] mt-1">
              Your order history will appear here
            </p>
          </div>
        ) : (
          orderList.map((order, index) => (
            <OrderRow key={`${order.order_id}-${index}`} order={order} />
          ))
        )}
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: OrderEvent }) {
  const sideLabel = order.side === 0 ? 'Buy' : 'Sell';
  const sideColor = order.side === 0 ? 'text-[var(--yes-green)]' : 'text-[var(--no-red)]';
  const sideBg = order.side === 0 ? 'bg-green-50' : 'bg-red-50';
  const sideStroke = order.side === 0 ? '#22c55e' : '#ef4444';

  const outcomeLabel = order.outcome === 0 ? 'YES' : 'NO';
  const outcomeColor = order.outcome === 0 ? 'text-[var(--yes-green)]' : 'text-[var(--no-red)]';

  const pricePercent = (order.price / 100).toFixed(1);

  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-[var(--gray-50)] rounded-lg transition-colors">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-full ${sideBg} flex items-center justify-center flex-shrink-0`}>
        {order.side === 0 ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sideStroke} strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sideStroke} strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-sm">
          <span className={`font-semibold ${sideColor}`}>{sideLabel}</span>
          <span className={`font-semibold ${outcomeColor}`}>{outcomeLabel}</span>
          <span className="text-[var(--gray-500)]">@</span>
          <span className="font-medium text-[var(--foreground)]">{pricePercent}%</span>
        </div>
        <div className="text-xs text-[var(--gray-500)]">
          Market #{order.market_id}
        </div>
      </div>

      {/* Amount & Time */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium text-[var(--foreground)]">
          {formatAmount(order.amount)}
        </div>
        <div className="text-xs text-[var(--gray-400)]">
          {formatTime(order.timestamp)}
        </div>
      </div>
    </div>
  );
}
