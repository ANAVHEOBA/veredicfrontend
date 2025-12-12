'use client';

import { useMutation } from '@tanstack/react-query';
import { useSuiClient, useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useMemo } from 'react';
import { MarketService } from '@/services/market.service';
import { useInvalidateMarkets } from './useMarkets';
import type { CreateMarketParams } from '@/types/market';

// =============================================================================
// SERVICE WITH SIGNER
// =============================================================================

/**
 * Get MarketService instance with transaction capabilities
 */
function useMarketServiceWithSigner() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  return useMemo(
    () => new MarketService(client).withSigner(signAndExecute),
    [client, signAndExecute]
  );
}

// =============================================================================
// CREATE MARKET
// =============================================================================

/**
 * Hook to create a new market
 */
export function useCreateMarket() {
  const service = useMarketServiceWithSigner();
  const account = useCurrentAccount();
  const { invalidateAll, invalidateByCreator } = useInvalidateMarkets();

  const mutation = useMutation({
    mutationFn: (params: CreateMarketParams) => service.createMarket(params),
    onSuccess: (result) => {
      if (result.success) {
        invalidateAll();
        if (account?.address) {
          invalidateByCreator(account.address);
        }
      }
    },
  });

  return {
    createMarket: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.data?.error || mutation.error,
    isSuccess: mutation.data?.success,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// =============================================================================
// VOID MARKET
// =============================================================================

interface VoidParams {
  marketId: string;
  reason?: string;
}

/**
 * Hook to void a market (by creator)
 */
export function useVoidMarket() {
  const service = useMarketServiceWithSigner();
  const { invalidateAll, invalidateMarket } = useInvalidateMarkets();

  const mutation = useMutation({
    mutationFn: ({ marketId, reason }: VoidParams) => service.voidByCreator(marketId, reason),
    onSuccess: (result, variables) => {
      if (result.success) {
        invalidateMarket(variables.marketId);
        invalidateAll();
      }
    },
  });

  return {
    voidMarket: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.data?.error || mutation.error,
    isSuccess: mutation.data?.success,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// =============================================================================
// END TRADING
// =============================================================================

interface EndTradingParams {
  marketId: string;
}

/**
 * Hook to end trading on a market
 */
export function useEndTrading() {
  const service = useMarketServiceWithSigner();
  const { invalidateAll, invalidateMarket } = useInvalidateMarkets();

  const mutation = useMutation({
    mutationFn: ({ marketId }: EndTradingParams) => service.endTrading(marketId),
    onSuccess: (result, variables) => {
      if (result.success) {
        invalidateMarket(variables.marketId);
        invalidateAll();
      }
    },
  });

  return {
    endTrading: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.data?.error || mutation.error,
    isSuccess: mutation.data?.success,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// =============================================================================
// COMBINED HOOK
// =============================================================================

/**
 * Combined hook with all market actions
 * Note: Market resolution is only available to Admin or Oracle, not creators
 */
export function useMarketActions() {
  const create = useCreateMarket();
  const voidMarket = useVoidMarket();
  const endTrading = useEndTrading();

  return {
    // Create
    createMarket: create.createMarket,
    isCreating: create.isLoading,
    createError: create.error,

    // Void (creator can void after trading ended)
    voidMarket: voidMarket.voidMarket,
    isVoiding: voidMarket.isLoading,
    voidError: voidMarket.error,

    // End Trading
    endTrading: endTrading.endTrading,
    isEndingTrading: endTrading.isLoading,
    endTradingError: endTrading.error,

    // Global loading state
    isLoading: create.isLoading || voidMarket.isLoading || endTrading.isLoading,
  };
}
