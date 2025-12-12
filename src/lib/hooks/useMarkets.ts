'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useMemo, useCallback } from 'react';
import { MarketService } from '@/services/market.service';
import type { Market, MarketFilters, MarketSortBy } from '@/types/market';

// =============================================================================
// SERVICE HOOK
// =============================================================================

/**
 * Get MarketService instance (read-only)
 */
export function useMarketService() {
  const client = useSuiClient();
  return useMemo(() => new MarketService(client), [client]);
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const marketKeys = {
  all: ['markets'] as const,
  lists: () => [...marketKeys.all, 'list'] as const,
  list: (filters?: MarketFilters, sortBy?: MarketSortBy) =>
    [...marketKeys.lists(), { filters, sortBy }] as const,
  details: () => [...marketKeys.all, 'detail'] as const,
  detail: (id: string) => [...marketKeys.details(), id] as const,
  byNumericId: (numericId: string) => [...marketKeys.all, 'numericId', numericId] as const,
  byNumericIds: (numericIds: string[]) => [...marketKeys.all, 'numericIds', numericIds.sort().join(',')] as const,
  byCreator: (creator: string) => [...marketKeys.all, 'creator', creator] as const,
  registry: () => [...marketKeys.all, 'registry'] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all markets
 */
export function useMarkets(options?: {
  filters?: MarketFilters;
  sortBy?: MarketSortBy;
  limit?: number;
  enabled?: boolean;
}) {
  const service = useMarketService();
  const { filters, sortBy, limit, enabled = true } = options || {};

  return useQuery({
    queryKey: marketKeys.list(filters, sortBy),
    queryFn: () => service.getMarkets({ filters, sortBy, limit }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled,
  });
}

/**
 * Fetch a single market by object ID
 */
export function useMarket(marketId: string | undefined) {
  const service = useMarketService();

  return useQuery({
    queryKey: marketKeys.detail(marketId || ''),
    queryFn: () => service.getMarket(marketId!),
    enabled: !!marketId,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single market by its numeric market_id (u64)
 * Use this when you have tokens that store the numeric market_id
 */
export function useMarketByNumericId(numericId: string | undefined) {
  const service = useMarketService();

  return useQuery({
    queryKey: marketKeys.byNumericId(numericId || ''),
    queryFn: () => service.getMarketByNumericId(numericId!),
    enabled: !!numericId,
    staleTime: 30_000,
  });
}

/**
 * Fetch multiple markets by their numeric market_ids
 * Returns a Map from numeric ID to Market
 */
export function useMarketsByNumericIds(numericIds: string[]) {
  const service = useMarketService();

  return useQuery({
    queryKey: marketKeys.byNumericIds(numericIds),
    queryFn: () => service.getMarketsByNumericIds(numericIds),
    enabled: numericIds.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Fetch open markets
 */
export function useOpenMarkets() {
  return useMarkets({ filters: { status: 'open' }, sortBy: 'volume' });
}

/**
 * Fetch markets created by the current user
 */
export function useMyMarkets() {
  const account = useCurrentAccount();
  return useMarkets({
    filters: { creator: account?.address },
    enabled: !!account?.address,
  });
}

/**
 * Fetch markets created by a specific address
 */
export function useMarketsByCreator(creator: string | undefined) {
  return useMarkets({
    filters: { creator },
    enabled: !!creator,
  });
}

/**
 * Fetch market registry info
 */
export function useMarketRegistry() {
  const service = useMarketService();

  return useQuery({
    queryKey: marketKeys.registry(),
    queryFn: () => service.getRegistry(),
    staleTime: 60_000,
  });
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

/**
 * Invalidate market queries
 */
export function useInvalidateMarkets() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: marketKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: marketKeys.lists() }),
    invalidateMarket: (id: string) =>
      queryClient.invalidateQueries({ queryKey: marketKeys.detail(id) }),
    invalidateByCreator: (creator: string) =>
      queryClient.invalidateQueries({ queryKey: marketKeys.byCreator(creator) }),
  };
}

/**
 * Prefetch a market
 */
export function usePrefetchMarket() {
  const queryClient = useQueryClient();
  const service = useMarketService();

  return (marketId: string) => {
    queryClient.prefetchQuery({
      queryKey: marketKeys.detail(marketId),
      queryFn: () => service.getMarket(marketId),
      staleTime: 30_000,
    });
  };
}

/**
 * Get cached market (synchronous)
 */
export function useCachedMarket(marketId: string): Market | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<Market>(marketKeys.detail(marketId)) ?? undefined;
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook to get a signer-enabled MarketService
 */
export function useMarketServiceWithSigner() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  return useMemo(() => {
    const service = new MarketService(client);
    return service.withSigner(async (tx) => {
      const result = await signAndExecute({ transaction: tx as any });
      return result;
    });
  }, [client, signAndExecute]);
}

/**
 * End trading on a market
 * Anyone can call this when the market's end_time has passed
 */
export function useEndTrading() {
  const service = useMarketServiceWithSigner();
  const { invalidateAll, invalidateMarket } = useInvalidateMarkets();

  return useMutation({
    mutationFn: async (marketId: string) => {
      const result = await service.endTrading(marketId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to end trading');
      }
      return result;
    },
    onSuccess: (_, marketId) => {
      invalidateMarket(marketId);
      invalidateAll();
    },
  });
}

/**
 * Void a market by creator
 * Only the market creator can void their own market
 */
export function useVoidByCreator() {
  const service = useMarketServiceWithSigner();
  const { invalidateAll, invalidateMarket } = useInvalidateMarkets();

  return useMutation({
    mutationFn: async ({ marketId, reason }: { marketId: string; reason?: string }) => {
      const result = await service.voidByCreator(marketId, reason);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to void market');
      }
      return result;
    },
    onSuccess: (_, { marketId }) => {
      invalidateMarket(marketId);
      invalidateAll();
    },
  });
}
