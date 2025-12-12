'use client';

import { useMemo } from 'react';
import { useMarkets } from '@/lib/hooks/useMarkets';
import { useMarketPrices } from '@/lib/hooks/useMarketPrices';
import MarketCard from './MarketCard';
import VersusCard from './VersusCard';
import SimpleCard from './SimpleCard';
import type { Market, MarketStatus, MarketSortBy } from '@/types/market';

interface MarketGridProps {
  status?: MarketStatus;
  category?: string;
  subCategory?: string;
  searchQuery?: string;
}

interface PoolPrice {
  yesPrice: number;
  noPrice: number;
}

function getCardComponent(market: Market, poolPrice?: PoolPrice) {
  const { outcomes } = market;

  // Apply live pool prices if available
  const marketWithPrices = poolPrice ? {
    ...market,
    outcomes: [
      { ...outcomes[0], price: poolPrice.yesPrice },
      { ...outcomes[1], price: poolPrice.noPrice },
    ],
  } : market;

  // Sports/versus style (2 teams competing)
  const isVersus =
    outcomes.length >= 2 &&
    !outcomes[0].name.toLowerCase().includes('yes') &&
    (market.isLive ||
      market.liveLabel ||
      market.category === 'Sports' ||
      market.category === 'Esports');

  // Simple yes/no market
  const isSimple =
    outcomes.length === 1 ||
    (outcomes.length === 2 && outcomes[0].name.toLowerCase() === 'yes');

  if (isVersus) {
    return <VersusCard market={marketWithPrices} />;
  }

  if (isSimple) {
    return <SimpleCard market={marketWithPrices} />;
  }

  // Default multi-outcome card
  return <MarketCard market={marketWithPrices} />;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="card p-3 md:p-4 h-[200px] animate-pulse"
        >
          <div className="flex gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--gray-200)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--gray-200)] rounded w-3/4" />
              <div className="h-4 bg-[var(--gray-200)] rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-[var(--gray-200)] rounded" />
            <div className="h-3 bg-[var(--gray-200)] rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gray-400)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
        No markets found
      </h3>
      <p className="text-sm text-[var(--gray-500)]">
        Be the first to create a prediction market!
      </p>
    </div>
  );
}

export default function MarketGrid({ status, category, subCategory, searchQuery }: MarketGridProps) {
  // Map category tabs to sort/filter options
  const { sortBy, categoryFilter } = useMemo(() => {
    let sort: MarketSortBy = 'volume';
    let catFilter: string | undefined = undefined;

    // Main category tabs affect sorting and filtering
    switch (category) {
      case 'trending':
        sort = 'trending';
        break;
      case 'breaking':
        sort = 'volume'; // Could be "hot" if we had that
        break;
      case 'new':
        sort = 'newest';
        break;
      case 'politics':
      case 'sports':
      case 'finance':
      case 'crypto':
      case 'tech':
      case 'culture':
      case 'world':
        catFilter = category;
        break;
      default:
        sort = 'volume';
    }

    // Sub-category can further filter
    if (subCategory && subCategory !== 'all') {
      catFilter = subCategory;
    }

    return { sortBy: sort, categoryFilter: catFilter };
  }, [category, subCategory]);

  const { data: markets, isLoading, error } = useMarkets({
    filters: {
      status: status,
      category: categoryFilter,
      search: searchQuery,
    },
    sortBy,
  });

  // Extract market IDs for fetching live prices
  const marketIds = useMemo(() =>
    (markets || []).map(m => m.marketId),
    [markets]
  );

  // Fetch live pool prices for all markets
  const { prices: poolPrices } = useMarketPrices(marketIds);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--danger)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
          Failed to load markets
        </h3>
        <p className="text-sm text-[var(--gray-500)]">
          Please check your connection and try again
        </p>
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {markets.map((market) => {
        const poolPrice = poolPrices.get(market.marketId);
        return (
          <div key={market.id}>
            {getCardComponent(market, poolPrice)}
          </div>
        );
      })}
    </div>
  );
}
