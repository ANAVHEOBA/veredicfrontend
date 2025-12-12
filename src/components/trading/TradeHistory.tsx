'use client';

import { useState } from 'react';
import { useRecentTrades, useRecentSwaps } from '@/lib/hooks/useTrading';

interface TradeHistoryProps {
  marketId: number | undefined;
}

type ActivityType = 'all' | 'trades' | 'swaps';

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

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface TradeEvent {
  type: 'trade';
  timestamp: number;
  buyer: string;
  seller: string;
  outcome: number;
  price: number;
  amount: number;
}

interface SwapEvent {
  type: 'swap';
  timestamp: number;
  trader: string;
  input_outcome: number;
  input_amount: number;
  output_amount: number;
}

type ActivityEvent = TradeEvent | SwapEvent;

export default function TradeHistory({ marketId }: TradeHistoryProps) {
  const [activityType, setActivityType] = useState<ActivityType>('all');

  const { data: trades, isLoading: tradesLoading } = useRecentTrades(marketId, 50);
  const { data: swaps, isLoading: swapsLoading } = useRecentSwaps(marketId, 50);

  const isLoading = tradesLoading || swapsLoading;

  // Helper to convert timestamp to milliseconds
  const toMs = (ts: number) => {
    if (ts < 100000000000) return ts * 1000;
    return ts;
  };

  // Combine and sort activities
  const activities: ActivityEvent[] = [];

  if (activityType === 'all' || activityType === 'trades') {
    (trades || []).forEach((trade: any) => {
      activities.push({
        type: 'trade',
        timestamp: toMs(Number(trade.timestamp || 0)),
        buyer: trade.buyer || '',
        seller: trade.seller || '',
        outcome: Number(trade.outcome || 0),
        price: Number(trade.price || 0),
        amount: Number(trade.amount || 0),
      });
    });
  }

  if (activityType === 'all' || activityType === 'swaps') {
    (swaps || []).forEach((swap: any) => {
      activities.push({
        type: 'swap',
        timestamp: toMs(Number(swap.timestamp || 0)),
        trader: swap.trader || '',
        input_outcome: Number(swap.input_outcome || 0),
        input_amount: Number(swap.input_amount || 0),
        output_amount: Number(swap.output_amount || 0),
      });
    });
  }

  // Sort by timestamp descending
  activities.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="card p-3 md:p-5">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)]">
          Activity
        </h3>

        {/* Filter Tabs */}
        <div className="flex gap-0.5 md:gap-1 bg-[var(--gray-100)] p-0.5 md:p-1 rounded-lg">
          {(['all', 'trades', 'swaps'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActivityType(type)}
              className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-medium transition-colors capitalize ${
                activityType === type
                  ? 'bg-white text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-1 max-h-64 md:max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-2 md:gap-3 py-2">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-[var(--gray-100)] rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 md:h-3 bg-[var(--gray-100)] rounded w-3/4" />
                  <div className="h-2 bg-[var(--gray-100)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-[var(--gray-500)]">
            <svg
              className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-[var(--gray-300)]"
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
            <p className="text-xs md:text-sm">No activity yet</p>
            <p className="text-[10px] md:text-xs text-[var(--gray-400)] mt-1">
              Trades and swaps will appear here
            </p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <ActivityRow key={`${activity.type}-${index}`} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityEvent }) {
  if (activity.type === 'trade') {
    return <TradeRow trade={activity} />;
  }
  return <SwapRow swap={activity} />;
}

function TradeRow({ trade }: { trade: TradeEvent }) {
  const outcomeLabel = trade.outcome === 0 ? 'YES' : 'NO';
  const outcomeColor = trade.outcome === 0 ? 'text-[var(--yes-green)]' : 'text-[var(--no-red)]';
  const pricePercent = (trade.price / 100).toFixed(1);

  return (
    <div className="flex items-center gap-2 md:gap-3 py-1.5 md:py-2 px-1.5 md:px-2 hover:bg-[var(--gray-50)] rounded-lg transition-colors">
      {/* Icon */}
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-xs md:text-sm">
          <span className="font-medium text-[var(--foreground)]">Trade</span>
          <span className={`font-semibold ${outcomeColor}`}>{outcomeLabel}</span>
          <span className="text-[var(--gray-500)]">@</span>
          <span className="font-medium text-[var(--foreground)]">{pricePercent}%</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[var(--gray-500)]">
          <span>{shortenAddress(trade.buyer)}</span>
          <svg className="w-2 h-2 md:w-2.5 md:h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span>{shortenAddress(trade.seller)}</span>
        </div>
      </div>

      {/* Amount & Time */}
      <div className="text-right flex-shrink-0">
        <div className="text-xs md:text-sm font-medium text-[var(--foreground)]">
          {formatAmount(trade.amount)}
        </div>
        <div className="text-[10px] md:text-xs text-[var(--gray-400)]">
          {formatTime(trade.timestamp)}
        </div>
      </div>
    </div>
  );
}

function SwapRow({ swap }: { swap: SwapEvent }) {
  const inputLabel = swap.input_outcome === 0 ? 'YES' : 'NO';
  const outputLabel = swap.input_outcome === 0 ? 'NO' : 'YES';
  const inputColor = swap.input_outcome === 0 ? 'text-[var(--yes-green)]' : 'text-[var(--no-red)]';
  const outputColor = swap.input_outcome === 0 ? 'text-[var(--no-red)]' : 'text-[var(--yes-green)]';

  return (
    <div className="flex items-center gap-2 md:gap-3 py-1.5 md:py-2 px-1.5 md:px-2 hover:bg-[var(--gray-50)] rounded-lg transition-colors">
      {/* Icon */}
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
        </svg>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-xs md:text-sm">
          <span className="font-medium text-[var(--foreground)]">Swap</span>
          <span className={`font-semibold ${inputColor}`}>{inputLabel}</span>
          <svg className="w-2.5 h-2.5 md:w-3 md:h-3" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className={`font-semibold ${outputColor}`}>{outputLabel}</span>
        </div>
        <div className="text-[10px] md:text-xs text-[var(--gray-500)]">
          {shortenAddress(swap.trader)}
        </div>
      </div>

      {/* Amount & Time */}
      <div className="text-right flex-shrink-0">
        <div className="text-xs md:text-sm">
          <span className={inputColor}>{formatAmount(swap.input_amount)}</span>
          <span className="text-[var(--gray-400)] mx-0.5 md:mx-1">→</span>
          <span className={outputColor}>{formatAmount(swap.output_amount)}</span>
        </div>
        <div className="text-[10px] md:text-xs text-[var(--gray-400)]">
          {formatTime(swap.timestamp)}
        </div>
      </div>
    </div>
  );
}
