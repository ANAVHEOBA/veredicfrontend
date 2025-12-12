// =============================================================================
// TRADING HOOKS
// =============================================================================
// React Query hooks for the Trading module

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { TradingService } from '@/services/trading.service';
import type {
  PlaceBuyOrderParams,
  PlaceSellOrderParams,
  CancelOrderParams,
  MatchOrdersParams,
  AddLiquidityParams,
  RemoveLiquidityParams,
  SwapParams,
  OrderOutcome,
} from '@/types/trading';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const tradingKeys = {
  all: ['trading'] as const,
  orderBooks: () => [...tradingKeys.all, 'orderBooks'] as const,
  orderBook: (id: string) => [...tradingKeys.orderBooks(), id] as const,
  orderBookForMarket: (marketId: number) => [...tradingKeys.orderBooks(), 'market', marketId] as const,
  pools: () => [...tradingKeys.all, 'pools'] as const,
  pool: (id: string) => [...tradingKeys.pools(), id] as const,
  poolForMarket: (marketId: number) => [...tradingKeys.pools(), 'market', marketId] as const,
  poolPrice: (id: string) => [...tradingKeys.pools(), 'price', id] as const,
  lpTokens: (address: string) => [...tradingKeys.all, 'lpTokens', address] as const,
  lpTokensForMarket: (address: string, marketId: number) => [...tradingKeys.lpTokens(address), marketId] as const,
  swapQuote: (poolId: string, inputAmount: number, inputOutcome: OrderOutcome) =>
    [...tradingKeys.all, 'swapQuote', poolId, inputAmount, inputOutcome] as const,
  trades: (marketId: number) => [...tradingKeys.all, 'trades', marketId] as const,
  swaps: (marketId: number) => [...tradingKeys.all, 'swaps', marketId] as const,
  userOrders: (address: string) => [...tradingKeys.all, 'userOrders', address] as const,
};

// =============================================================================
// SERVICE HOOKS
// =============================================================================

/**
 * Get trading service (read-only, no signer)
 */
export function useTradingService() {
  const client = useSuiClient();
  return new TradingService(client);
}

/**
 * Get trading service with signer for write operations
 */
export function useTradingServiceWithSigner() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  return new TradingService(client, async (tx) => {
    return await signAndExecute({ transaction: tx });
  });
}

// =============================================================================
// INVALIDATION HOOK
// =============================================================================

export function useInvalidateTrading() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: tradingKeys.all }),
    invalidateOrderBook: (id: string) => queryClient.invalidateQueries({ queryKey: tradingKeys.orderBook(id) }),
    invalidatePool: (id: string) => queryClient.invalidateQueries({ queryKey: tradingKeys.pool(id) }),
    invalidateLPTokens: (address: string) => queryClient.invalidateQueries({ queryKey: tradingKeys.lpTokens(address) }),
    invalidateTrades: (marketId: number) => queryClient.invalidateQueries({ queryKey: tradingKeys.trades(marketId) }),
  };
}

// =============================================================================
// ORDER BOOK QUERIES
// =============================================================================

/**
 * Get order book by ID
 */
export function useOrderBook(orderBookId: string | undefined) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.orderBook(orderBookId || ''),
    queryFn: () => service.getOrderBook(orderBookId!),
    enabled: !!orderBookId,
    staleTime: 10_000, // 10 seconds
    refetchInterval: 15_000, // Auto-refresh every 15 seconds
  });
}

/**
 * Find order book for a market
 */
export function useOrderBookForMarket(marketId: number | undefined) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.orderBookForMarket(marketId || 0),
    queryFn: () => service.findOrderBookForMarket(marketId!),
    enabled: marketId !== undefined,
  });
}

// =============================================================================
// LIQUIDITY POOL QUERIES
// =============================================================================

/**
 * Get liquidity pool by ID
 */
export function useLiquidityPool(poolId: string | undefined) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.pool(poolId || ''),
    queryFn: () => service.getLiquidityPool(poolId!),
    enabled: !!poolId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

/**
 * Find liquidity pool for a market
 */
export function useLiquidityPoolForMarket(marketId: number | undefined) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.poolForMarket(marketId || 0),
    queryFn: () => service.findLiquidityPoolForMarket(marketId!),
    enabled: marketId !== undefined,
  });
}

/**
 * Get pool price
 */
export function usePoolPrice(poolId: string | undefined) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.poolPrice(poolId || ''),
    queryFn: () => service.getPoolPrice(poolId!),
    enabled: !!poolId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

// =============================================================================
// SWAP QUOTE QUERIES
// =============================================================================

/**
 * Get swap quote
 */
export function useSwapQuote(
  poolId: string | undefined,
  inputAmount: number,
  inputOutcome: OrderOutcome,
  slippageBps: number = 100
) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.swapQuote(poolId || '', inputAmount, inputOutcome),
    queryFn: () => service.getSwapQuote(poolId!, inputAmount, inputOutcome, slippageBps),
    enabled: !!poolId && inputAmount > 0,
    staleTime: 5_000,
  });
}

// =============================================================================
// LP TOKEN QUERIES
// =============================================================================

/**
 * Get user's LP tokens
 */
export function useUserLPTokens(marketId?: number) {
  const account = useCurrentAccount();
  const service = useTradingService();

  return useQuery({
    queryKey: marketId !== undefined
      ? tradingKeys.lpTokensForMarket(account?.address || '', marketId)
      : tradingKeys.lpTokens(account?.address || ''),
    queryFn: () => service.getUserLPTokens(account!.address, marketId),
    enabled: !!account?.address,
  });
}

// =============================================================================
// TRADE/SWAP HISTORY QUERIES
// =============================================================================

/**
 * Get recent trades for a market
 */
export function useRecentTrades(marketId: number | undefined, limit: number = 50) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.trades(marketId || 0),
    queryFn: () => service.getRecentTrades(marketId!, limit),
    enabled: marketId !== undefined,
    staleTime: 30_000,
  });
}

/**
 * Get recent swaps for a market
 */
export function useRecentSwaps(marketId: number | undefined, limit: number = 50) {
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.swaps(marketId || 0),
    queryFn: () => service.getRecentSwaps(marketId!, limit),
    enabled: marketId !== undefined,
    staleTime: 30_000,
  });
}

/**
 * Get user's order history
 */
export function useUserOrderHistory(limit: number = 50) {
  const account = useCurrentAccount();
  const service = useTradingService();

  return useQuery({
    queryKey: tradingKeys.userOrders(account?.address || ''),
    queryFn: () => service.getUserOrderHistory(account!.address, limit),
    enabled: !!account?.address,
  });
}

/**
 * Get user's open orders for a market
 */
export function useUserOpenOrders(marketId: number | undefined) {
  const account = useCurrentAccount();
  const service = useTradingService();

  return useQuery({
    queryKey: [...tradingKeys.userOrders(account?.address || ''), 'open', marketId],
    queryFn: () => service.getUserOpenOrders(account!.address, marketId!),
    enabled: !!account?.address && marketId !== undefined,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// =============================================================================
// ORDER BOOK MUTATIONS
// =============================================================================

/**
 * Create order book for a market
 */
export function useCreateOrderBook() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (marketId: number) => {
      const result = await service.createOrderBook(marketId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create order book');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Place a buy order
 */
export function usePlaceBuyOrder() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: PlaceBuyOrderParams) => {
      const result = await service.placeBuyOrder(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to place buy order');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Place a sell order
 */
export function usePlaceSellOrder() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: PlaceSellOrderParams) => {
      const result = await service.placeSellOrder(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to place sell order');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Cancel an order
 */
export function useCancelOrder() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: CancelOrderParams) => {
      const result = await service.cancelOrder(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to cancel order');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Match two orders (keeper function)
 */
export function useMatchOrders() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: MatchOrdersParams) => {
      const result = await service.matchOrders(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to match orders');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

// =============================================================================
// LIQUIDITY POOL MUTATIONS
// =============================================================================

/**
 * Create liquidity pool for a market
 */
export function useCreateLiquidityPool() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (marketId: number) => {
      const result = await service.createLiquidityPool(marketId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create liquidity pool');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Add liquidity to pool
 */
export function useAddLiquidity() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: AddLiquidityParams) => {
      const result = await service.addLiquidity(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to add liquidity');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Remove liquidity from pool
 */
export function useRemoveLiquidity() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: RemoveLiquidityParams) => {
      const result = await service.removeLiquidity(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to remove liquidity');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

// =============================================================================
// SWAP MUTATIONS
// =============================================================================

/**
 * Swap YES for NO tokens
 */
export function useSwapYesForNo() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      const result = await service.swapYesForNo(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to swap YES for NO');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Swap NO for YES tokens
 */
export function useSwapNoForYes() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      const result = await service.swapNoForYes(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to swap NO for YES');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Unified swap hook
 */
export function useSwap() {
  const service = useTradingServiceWithSigner();
  const { invalidateAll } = useInvalidateTrading();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      const result = await service.swap(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to swap');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

// =============================================================================
// COMBINED HOOKS
// =============================================================================

/**
 * Get full trading info for a market (order book + pool)
 */
export function useMarketTradingInfo(marketId: number | undefined) {
  const orderBookQuery = useOrderBookForMarket(marketId);
  const poolQuery = useLiquidityPoolForMarket(marketId);

  return {
    orderBookId: orderBookQuery.data,
    poolId: poolQuery.data,
    isLoading: orderBookQuery.isLoading || poolQuery.isLoading,
    isError: orderBookQuery.isError || poolQuery.isError,
    error: orderBookQuery.error || poolQuery.error,
  };
}

/**
 * Price history point for charts
 */
export interface PriceHistoryPoint {
  time: number;
  yesPrice: number;
  noPrice: number;
}

/**
 * Get price history from swap events
 * Returns price points over time for charting
 * Only shows REAL data - no fake historical data generation
 */
export function usePriceHistory(
  marketId: number | undefined,
  currentYesPrice: number = 50,
  marketCreatedAt?: number // Optional market creation timestamp in ms
) {
  const { data: swaps, isLoading } = useRecentSwaps(marketId, 100);

  // Build price history from REAL swap events only
  const priceHistory = useMemo(() => {
    const history: PriceHistoryPoint[] = [];
    const now = Date.now();

    // Helper to convert timestamp to milliseconds
    const toMs = (ts: number) => {
      // If timestamp is in seconds (less than year 3000 in ms), convert to ms
      if (ts < 100000000000) {
        return ts * 1000;
      }
      return ts;
    };

    // If no swaps, show minimal data: just the current state
    // This creates a flat line from market creation (or recent past) to now
    if (!swaps || swaps.length === 0) {
      // Use market creation time if provided, otherwise use a short period (1 hour ago)
      const startTime = marketCreatedAt ? toMs(marketCreatedAt) : now - 60 * 60 * 1000;

      // Two points only: start and current
      // Both at current price since no trading has happened
      history.push({
        time: startTime,
        yesPrice: currentYesPrice,
        noPrice: 100 - currentYesPrice,
      });

      history.push({
        time: now,
        yesPrice: currentYesPrice,
        noPrice: 100 - currentYesPrice,
      });

      return history;
    }

    // Sort swaps by timestamp (oldest first)
    const sortedSwaps = [...swaps].sort((a: any, b: any) => {
      const timeA = toMs(Number(a.timestamp || 0));
      const timeB = toMs(Number(b.timestamp || 0));
      return timeA - timeB;
    });

    // Track cumulative reserves to calculate price after each swap
    let runningYesPrice = 50; // Start from 50%

    // Add initial point at market creation or before first swap
    const firstSwap = sortedSwaps[0] as any;
    const firstSwapTime = toMs(Number(firstSwap?.timestamp || 0));
    const startTime = marketCreatedAt ? toMs(marketCreatedAt) : firstSwapTime - 60000; // 1 min before first swap

    if (startTime > 0) {
      history.push({
        time: startTime,
        yesPrice: 50, // Markets start at 50/50
        noPrice: 50,
      });
    }

    // Add a point for each swap
    for (const swap of sortedSwaps) {
      const swapData = swap as any;
      const timestamp = toMs(Number(swapData.timestamp || 0));

      if (timestamp <= 0) continue;

      // Estimate price change based on swap direction and size
      // Input outcome: 0 = YES, 1 = NO
      const inputOutcome = Number(swapData.input_outcome || swapData.inputOutcome || 0);
      const inputAmount = Number(swapData.input_amount || swapData.inputAmount || 0);
      const outputAmount = Number(swapData.output_amount || swapData.outputAmount || 0);

      // If selling YES (inputOutcome=0), YES price goes down
      // If selling NO (inputOutcome=1), YES price goes up
      if (inputAmount > 0 && outputAmount > 0) {
        const priceImpact = Math.min(5, (inputAmount / 1e9) * 2); // Cap at 5%
        if (inputOutcome === 0) {
          runningYesPrice = Math.max(1, runningYesPrice - priceImpact);
        } else {
          runningYesPrice = Math.min(99, runningYesPrice + priceImpact);
        }
      }

      history.push({
        time: timestamp,
        yesPrice: Math.round(runningYesPrice),
        noPrice: Math.round(100 - runningYesPrice),
      });
    }

    // Add current point at end with actual current price
    history.push({
      time: now,
      yesPrice: currentYesPrice,
      noPrice: 100 - currentYesPrice,
    });

    // Final sort to ensure order
    history.sort((a, b) => a.time - b.time);

    return history;
  }, [swaps, currentYesPrice, marketCreatedAt]);

  return {
    data: priceHistory,
    isLoading,
  };
}
