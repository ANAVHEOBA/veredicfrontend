// =============================================================================
// ORACLE HOOKS
// =============================================================================
// React Query hooks for the Oracle module

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { OracleService } from '@/services/oracle.service';
import type {
  RequestResolutionParams,
  ProposeOutcomeParams,
  DisputeOutcomeParams,
  FinalizeUndisputedParams,
} from '@/types/oracle';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const oracleKeys = {
  all: ['oracle'] as const,
  registry: () => [...oracleKeys.all, 'registry'] as const,
  registryById: (id: string) => [...oracleKeys.registry(), id] as const,
  request: (id: string) => [...oracleKeys.all, 'request', id] as const,
  requestForMarket: (marketId: number) => [...oracleKeys.all, 'requestForMarket', marketId] as const,
  requests: () => [...oracleKeys.all, 'requests'] as const,
  marketHistory: (marketId: number) => [...oracleKeys.all, 'marketHistory', marketId] as const,
  userHistory: (address: string) => [...oracleKeys.all, 'userHistory', address] as const,
};

// =============================================================================
// SERVICE HOOKS
// =============================================================================

/**
 * Get oracle service (read-only, no signer)
 */
export function useOracleService() {
  const client = useSuiClient();
  return new OracleService(client);
}

/**
 * Get oracle service with signer for write operations
 */
export function useOracleServiceWithSigner() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  return new OracleService(client, async (tx) => {
    return await signAndExecute({ transaction: tx });
  });
}

// =============================================================================
// INVALIDATION HOOK
// =============================================================================

export function useInvalidateOracle() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: oracleKeys.all }),
    invalidateRegistry: () => queryClient.invalidateQueries({ queryKey: oracleKeys.registry() }),
    invalidateRequest: (id: string) =>
      queryClient.invalidateQueries({ queryKey: oracleKeys.request(id) }),
    invalidateRequestForMarket: (marketId: number) =>
      queryClient.invalidateQueries({ queryKey: oracleKeys.requestForMarket(marketId) }),
    invalidateMarketHistory: (marketId: number) =>
      queryClient.invalidateQueries({ queryKey: oracleKeys.marketHistory(marketId) }),
    invalidateUserHistory: (address: string) =>
      queryClient.invalidateQueries({ queryKey: oracleKeys.userHistory(address) }),
  };
}

// =============================================================================
// ORACLE REGISTRY QUERIES
// =============================================================================

/**
 * Find and get oracle registry
 */
export function useOracleRegistry() {
  const service = useOracleService();

  return useQuery({
    queryKey: oracleKeys.registry(),
    queryFn: async () => {
      const registryId = await service.findOracleRegistry();
      if (!registryId) return null;
      return service.getOracleRegistry(registryId);
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Get oracle registry by ID
 */
export function useOracleRegistryById(registryId: string | undefined) {
  const service = useOracleService();

  return useQuery({
    queryKey: oracleKeys.registryById(registryId || ''),
    queryFn: () => service.getOracleRegistry(registryId!),
    enabled: !!registryId,
    staleTime: 60_000,
  });
}

// =============================================================================
// RESOLUTION REQUEST QUERIES
// =============================================================================

/**
 * Get resolution request by ID
 */
export function useResolutionRequest(requestId: string | undefined) {
  const service = useOracleService();

  return useQuery({
    queryKey: oracleKeys.request(requestId || ''),
    queryFn: () => service.getResolutionRequest(requestId!),
    enabled: !!requestId,
    staleTime: 10_000, // 10 seconds - need fresh data for time-sensitive operations
    refetchInterval: 30_000, // 30 seconds
  });
}

/**
 * Find resolution request for a market
 */
export function useResolutionRequestForMarket(marketId: number | undefined) {
  const service = useOracleService();

  return useQuery({
    queryKey: oracleKeys.requestForMarket(marketId || 0),
    queryFn: async () => {
      const requestId = await service.findRequestForMarket(marketId!);
      if (!requestId) return null;
      return service.getResolutionRequest(requestId);
    },
    enabled: !!marketId && marketId > 0,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

// =============================================================================
// HISTORY QUERIES
// =============================================================================

/**
 * Get oracle history for a market
 */
export function useMarketOracleHistory(marketId: number | undefined, limit: number = 20) {
  const service = useOracleService();

  return useQuery({
    queryKey: oracleKeys.marketHistory(marketId || 0),
    queryFn: () => service.getMarketOracleHistory(marketId!, limit),
    enabled: !!marketId && marketId > 0,
    staleTime: 60_000,
  });
}

/**
 * Get current user's oracle participation history
 */
export function useUserOracleHistory(limit: number = 50) {
  const account = useCurrentAccount();
  const service = useOracleService();

  return useQuery({
    queryKey: oracleKeys.userHistory(account?.address || ''),
    queryFn: () => service.getUserOracleHistory(account!.address, limit),
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Request resolution for a market
 */
export function useRequestResolution() {
  const account = useCurrentAccount();
  const service = useOracleServiceWithSigner();
  const { invalidateRequestForMarket, invalidateUserHistory } = useInvalidateOracle();

  return useMutation({
    mutationFn: async (params: RequestResolutionParams) => {
      const result = await service.requestResolution(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to request resolution');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate all market requests since we don't have marketId directly
      invalidateRequestForMarket(0);
      if (account?.address) {
        invalidateUserHistory(account.address);
      }
    },
  });
}

/**
 * Propose outcome for a resolution request
 */
export function useProposeOutcome() {
  const account = useCurrentAccount();
  const service = useOracleServiceWithSigner();
  const { invalidateRequest, invalidateUserHistory } = useInvalidateOracle();

  return useMutation({
    mutationFn: async (params: ProposeOutcomeParams) => {
      const result = await service.proposeOutcome(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to propose outcome');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateRequest(variables.requestId);
      if (account?.address) {
        invalidateUserHistory(account.address);
      }
    },
  });
}

/**
 * Dispute a proposed outcome
 */
export function useDisputeOutcome() {
  const account = useCurrentAccount();
  const service = useOracleServiceWithSigner();
  const { invalidateRequest, invalidateUserHistory } = useInvalidateOracle();

  return useMutation({
    mutationFn: async (params: DisputeOutcomeParams) => {
      const result = await service.disputeOutcome(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to dispute outcome');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateRequest(variables.requestId);
      if (account?.address) {
        invalidateUserHistory(account.address);
      }
    },
  });
}

/**
 * Finalize undisputed resolution
 */
export function useFinalizeUndisputed() {
  const service = useOracleServiceWithSigner();
  const { invalidateRequest } = useInvalidateOracle();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FinalizeUndisputedParams) => {
      const result = await service.finalizeUndisputed(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to finalize resolution');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateRequest(variables.requestId);
      // Also invalidate market data since resolution affects market state
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });
}

// =============================================================================
// COMBINED HOOKS
// =============================================================================

/**
 * Get all oracle data for a market
 */
export function useMarketOracleData(marketId: number | undefined) {
  const { data: registry, isLoading: registryLoading } = useOracleRegistry();
  const { data: request, isLoading: requestLoading, refetch: refetchRequest } = useResolutionRequestForMarket(marketId);
  const { data: history, isLoading: historyLoading } = useMarketOracleHistory(marketId);

  return {
    registry,
    request,
    history,
    isLoading: registryLoading || requestLoading || historyLoading,
    refetchRequest,
    // Computed values
    hasActiveRequest: !!request && !request.isFinalized && !request.isCancelled,
    canRequestResolution: !request || request.isFinalized || request.isCancelled,
    defaultBond: registry?.defaultBond || 10_000_000,
    defaultBondFormatted: registry?.defaultBondFormatted || '0.01 SUI',
  };
}

/**
 * Get user's oracle participation stats
 */
export function useUserOracleStats() {
  const { data: history, isLoading } = useUserOracleHistory();

  const stats = {
    totalRequests: 0,
    totalProposals: 0,
    totalDisputes: 0,
    successfulProposals: 0,
    successfulDisputes: 0,
  };

  if (history) {
    for (const item of history) {
      switch ((item as any).type) {
        case 'requested':
          stats.totalRequests++;
          break;
        case 'proposed':
          stats.totalProposals++;
          break;
        case 'disputed':
          stats.totalDisputes++;
          break;
      }
    }
  }

  return {
    ...stats,
    history,
    isLoading,
  };
}
