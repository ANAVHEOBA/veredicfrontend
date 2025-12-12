'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { useMemo } from 'react';
import { CONTRACT_CONFIG } from '@/lib/config';

const { PACKAGE_ID } = CONTRACT_CONFIG;

interface PoolPrice {
  marketId: number;
  poolId: string;
  yesPrice: number; // 0-100
  noPrice: number;  // 0-100
}

interface MarketPricesResult {
  prices: Map<number, PoolPrice>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch pool prices for multiple markets at once
 * This is more efficient than fetching each market's pool price individually
 */
export function useMarketPrices(marketIds: number[]): MarketPricesResult {
  const client = useSuiClient();

  // Create a stable key from market IDs
  const marketIdsKey = useMemo(() =>
    [...marketIds].sort((a, b) => a - b).join(','),
    [marketIds]
  );

  const query = useQuery({
    queryKey: ['marketPrices', marketIdsKey],
    queryFn: async (): Promise<Map<number, PoolPrice>> => {
      const prices = new Map<number, PoolPrice>();

      if (marketIds.length === 0) return prices;

      try {
        // First, get all pool creation events to find pool IDs for each market
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::trading_events::LiquidityPoolCreated`,
          },
          limit: 100,
        });

        // Build a map of marketId -> txDigest for pool creation
        const marketToTxDigest = new Map<number, string>();
        for (const event of events.data) {
          const parsed = event.parsedJson as { market_id: string };
          const marketId = Number(parsed.market_id);
          if (marketIds.includes(marketId)) {
            marketToTxDigest.set(marketId, event.id.txDigest);
          }
        }

        // Get pool object IDs from transactions
        const marketToPoolId = new Map<number, string>();
        for (const [marketId, txDigest] of marketToTxDigest) {
          try {
            const txResponse = await client.getTransactionBlock({
              digest: txDigest,
              options: { showObjectChanges: true },
            });

            const poolCreated = txResponse.objectChanges?.find(
              (change) =>
                change.type === 'created' &&
                change.objectType?.includes('::trading_types::LiquidityPool')
            );

            if (poolCreated && 'objectId' in poolCreated) {
              marketToPoolId.set(marketId, poolCreated.objectId);
            }
          } catch (err) {
            console.warn('Failed to get pool ID for market', marketId, err);
          }
        }

        // Fetch all pool objects in parallel
        const poolIds = Array.from(marketToPoolId.values());
        if (poolIds.length === 0) return prices;

        const poolResponses = await client.multiGetObjects({
          ids: poolIds,
          options: { showContent: true },
        });

        // Process pool data and calculate prices
        const poolIdToMarketId = new Map<string, number>();
        for (const [marketId, poolId] of marketToPoolId) {
          poolIdToMarketId.set(poolId, marketId);
        }

        for (let i = 0; i < poolResponses.length; i++) {
          const response = poolResponses[i];
          const poolId = poolIds[i];
          const marketId = poolIdToMarketId.get(poolId);

          if (!marketId || !response.data?.content || response.data.content.dataType !== 'moveObject') {
            continue;
          }

          const fields = response.data.content.fields as any;
          const yesReserve = Number(fields.yes_reserve || 0);
          const noReserve = Number(fields.no_reserve || 0);
          const totalReserve = yesReserve + noReserve;

          // Calculate prices from reserves
          // Price of YES = noReserve / totalReserve (probability that YES wins)
          let yesPrice = 50;
          let noPrice = 50;

          if (totalReserve > 0) {
            yesPrice = Math.round((noReserve / totalReserve) * 100);
            noPrice = 100 - yesPrice;
          }

          prices.set(marketId, {
            marketId,
            poolId,
            yesPrice,
            noPrice,
          });
        }

        return prices;
      } catch (error) {
        console.error('Failed to fetch market prices:', error);
        return prices;
      }
    },
    enabled: marketIds.length > 0,
    staleTime: 15_000, // 15 seconds
    refetchInterval: 30_000, // Refresh every 30 seconds
  });

  return {
    prices: query.data || new Map(),
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

/**
 * Hook to fetch pool price for a single market
 */
export function useMarketPrice(marketId: number | undefined): {
  yesPrice: number;
  noPrice: number;
  isLoading: boolean;
} {
  const marketIds = useMemo(() =>
    marketId !== undefined ? [marketId] : [],
    [marketId]
  );

  const { prices, isLoading } = useMarketPrices(marketIds);

  const price = marketId !== undefined ? prices.get(marketId) : undefined;

  return {
    yesPrice: price?.yesPrice ?? 50,
    noPrice: price?.noPrice ?? 50,
    isLoading,
  };
}
