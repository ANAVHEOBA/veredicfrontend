'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useMemo, useCallback } from 'react';
import { TokenService } from '@/services/token.service';
import { CONTRACT_CONFIG } from '@/lib/config';
import { marketKeys } from './useMarkets';
import type {
  YesToken,
  NoToken,
  TokenVault,
  MarketPosition,
  Portfolio,
  MintTokensParams,
  MergeTokenSetParams,
  RedeemTokensParams,
  RedeemVoidedParams,
  SplitTokenParams,
  MergeTokensParams,
} from '@/types/token';

// =============================================================================
// SERVICE HOOK
// =============================================================================

/**
 * Get TokenService instance (read-only)
 */
export function useTokenService() {
  const client = useSuiClient();
  return useMemo(() => new TokenService(client), [client]);
}

/**
 * Get TokenService instance with signer (for mutations)
 */
export function useTokenServiceWithSigner() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  return useMemo(
    () => new TokenService(client).withSigner(signAndExecute),
    [client, signAndExecute]
  );
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const tokenKeys = {
  all: ['tokens'] as const,
  yesTokens: (owner: string) => [...tokenKeys.all, 'yes', owner] as const,
  noTokens: (owner: string) => [...tokenKeys.all, 'no', owner] as const,
  tokensForMarket: (owner: string, marketId: string) =>
    [...tokenKeys.all, 'market', owner, marketId] as const,
  position: (owner: string, marketId: string) =>
    [...tokenKeys.all, 'position', owner, marketId] as const,
  portfolio: (owner: string) => [...tokenKeys.all, 'portfolio', owner] as const,
  vault: (vaultId: string) => [...tokenKeys.all, 'vault', vaultId] as const,
  vaultForMarket: (marketId: string) =>
    [...tokenKeys.all, 'vaultForMarket', marketId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all YES tokens for current user
 */
export function useYesTokens() {
  const service = useTokenService();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: tokenKeys.yesTokens(account?.address || ''),
    queryFn: () => service.getYesTokens(account!.address),
    enabled: !!account?.address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch all NO tokens for current user
 */
export function useNoTokens() {
  const service = useTokenService();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: tokenKeys.noTokens(account?.address || ''),
    queryFn: () => service.getNoTokens(account!.address),
    enabled: !!account?.address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch tokens for a specific market
 */
export function useTokensForMarket(marketId: string | undefined) {
  const service = useTokenService();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: tokenKeys.tokensForMarket(account?.address || '', marketId || ''),
    queryFn: () => service.getTokensForMarket(account!.address, marketId!),
    enabled: !!account?.address && !!marketId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch user's position in a specific market
 */
export function useMarketPosition(marketId: string | undefined) {
  const service = useTokenService();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: tokenKeys.position(account?.address || '', marketId || ''),
    queryFn: () => service.getMarketPosition(account!.address, marketId!),
    enabled: !!account?.address && !!marketId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch user's full portfolio across all markets
 */
export function usePortfolio() {
  const service = useTokenService();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: tokenKeys.portfolio(account?.address || ''),
    queryFn: () => service.getPortfolio(account!.address),
    enabled: !!account?.address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch a token vault by ID
 */
export function useVault(vaultId: string | undefined) {
  const service = useTokenService();

  return useQuery({
    queryKey: tokenKeys.vault(vaultId || ''),
    queryFn: () => service.getVault(vaultId!),
    enabled: !!vaultId,
    staleTime: 30_000,
  });
}

/**
 * Find vault for a market
 */
export function useVaultForMarket(marketId: string | undefined) {
  const service = useTokenService();

  return useQuery({
    queryKey: tokenKeys.vaultForMarket(marketId || ''),
    queryFn: () => service.findVaultForMarket(marketId!),
    enabled: !!marketId,
    staleTime: 60_000,
  });
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

/**
 * Invalidate token queries
 */
export function useInvalidateTokens() {
  const queryClient = useQueryClient();
  const account = useCurrentAccount();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: tokenKeys.all }),
    invalidateYesTokens: () =>
      account?.address &&
      queryClient.invalidateQueries({ queryKey: tokenKeys.yesTokens(account.address) }),
    invalidateNoTokens: () =>
      account?.address &&
      queryClient.invalidateQueries({ queryKey: tokenKeys.noTokens(account.address) }),
    invalidatePosition: (marketId: string) =>
      account?.address &&
      queryClient.invalidateQueries({
        queryKey: tokenKeys.position(account.address, marketId),
      }),
    invalidatePortfolio: () =>
      account?.address &&
      queryClient.invalidateQueries({ queryKey: tokenKeys.portfolio(account.address) }),
    invalidateVault: (vaultId: string) =>
      queryClient.invalidateQueries({ queryKey: tokenKeys.vault(vaultId) }),
  };
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

const { PACKAGE_ID } = CONTRACT_CONFIG;
const CLOCK_ID = '0x6';

/**
 * Create a token vault for a market
 */
export function useCreateVault() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll } = useInvalidateTokens();

  return useMutation({
    mutationFn: async (marketId: string) => {
      const result = await service.createVault(marketId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create vault');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
}

/**
 * Mint YES + NO tokens by depositing SUI
 */
export function useMintTokens() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePosition, invalidatePortfolio, invalidateVault } =
    useInvalidateTokens();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MintTokensParams) => {
      const result = await service.mintTokens(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to mint tokens');
      }
      return result;
    },
    onSuccess: (_, params) => {
      invalidateAll();
      invalidatePosition(params.marketId);
      invalidatePortfolio();
      invalidateVault(params.vaultId);
      // Also invalidate market queries as volume may have changed
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    },
  });
}

/**
 * Merge YES + NO tokens back to SUI
 */
export function useMergeTokenSet() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePosition, invalidatePortfolio, invalidateVault } =
    useInvalidateTokens();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MergeTokenSetParams) => {
      const result = await service.mergeTokenSet(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to merge tokens');
      }
      return result;
    },
    onSuccess: (_, params) => {
      invalidateAll();
      invalidatePosition(params.marketId);
      invalidatePortfolio();
      invalidateVault(params.vaultId);
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    },
  });
}

/**
 * Redeem YES tokens after market resolves to YES
 */
export function useRedeemYes() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePosition, invalidatePortfolio, invalidateVault } =
    useInvalidateTokens();

  return useMutation({
    mutationFn: async (params: RedeemTokensParams) => {
      const result = await service.redeemYes(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to redeem YES tokens');
      }
      return result;
    },
    onSuccess: (_, params) => {
      invalidateAll();
      invalidatePosition(params.marketId);
      invalidatePortfolio();
      invalidateVault(params.vaultId);
    },
  });
}

/**
 * Redeem NO tokens after market resolves to NO
 */
export function useRedeemNo() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePosition, invalidatePortfolio, invalidateVault } =
    useInvalidateTokens();

  return useMutation({
    mutationFn: async (params: RedeemTokensParams) => {
      const result = await service.redeemNo(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to redeem NO tokens');
      }
      return result;
    },
    onSuccess: (_, params) => {
      invalidateAll();
      invalidatePosition(params.marketId);
      invalidatePortfolio();
      invalidateVault(params.vaultId);
    },
  });
}

/**
 * Redeem tokens from a voided market
 */
export function useRedeemVoided() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePosition, invalidatePortfolio, invalidateVault } =
    useInvalidateTokens();

  return useMutation({
    mutationFn: async (params: RedeemVoidedParams) => {
      const result = await service.redeemVoided(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to redeem voided tokens');
      }
      return result;
    },
    onSuccess: (_, params) => {
      invalidateAll();
      invalidatePosition(params.marketId);
      invalidatePortfolio();
      invalidateVault(params.vaultId);
    },
  });
}

/**
 * Split a token into two
 */
export function useSplitToken() {
  const service = useTokenServiceWithSigner();
  const account = useCurrentAccount();
  const { invalidateAll, invalidatePortfolio } = useInvalidateTokens();

  return useMutation({
    mutationFn: async (params: SplitTokenParams & { recipient?: string }) => {
      const recipient = params.recipient || account?.address;
      if (!recipient) {
        throw new Error('No recipient address');
      }

      const result =
        params.tokenType === 'yes'
          ? await service.splitYesToken(params, recipient)
          : await service.splitNoToken(params, recipient);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to split token');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
      invalidatePortfolio();
    },
  });
}

/**
 * Merge two tokens of the same type
 */
export function useMergeTokens() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePortfolio } = useInvalidateTokens();

  return useMutation({
    mutationFn: async (params: MergeTokensParams) => {
      const result =
        params.tokenType === 'yes'
          ? await service.mergeYesTokens(params)
          : await service.mergeNoTokens(params);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to merge tokens');
      }
      return result;
    },
    onSuccess: () => {
      invalidateAll();
      invalidatePortfolio();
    },
  });
}

// =============================================================================
// COMBINED HOOKS
// =============================================================================

/**
 * Get all user tokens (YES and NO) in a single hook
 */
export function useAllTokens() {
  const yesQuery = useYesTokens();
  const noQuery = useNoTokens();

  return {
    yesTokens: yesQuery.data || [],
    noTokens: noQuery.data || [],
    isLoading: yesQuery.isLoading || noQuery.isLoading,
    isError: yesQuery.isError || noQuery.isError,
    error: yesQuery.error || noQuery.error,
    refetch: () => {
      yesQuery.refetch();
      noQuery.refetch();
    },
  };
}

/**
 * Hook to check if user has tokens in a market
 */
export function useHasPosition(marketId: string | undefined) {
  const { data: position, isLoading } = useMarketPosition(marketId);

  return {
    hasPosition: position
      ? position.totalYesBalance > 0 || position.totalNoBalance > 0
      : false,
    position,
    isLoading,
  };
}

/**
 * Consolidate all YES tokens into one (merge multiple tokens of same type)
 */
export function useConsolidateYesTokens() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePortfolio } = useInvalidateTokens();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokens: YesToken[]) => {
      if (tokens.length < 2) {
        throw new Error('Need at least 2 tokens to consolidate');
      }

      // Sort by balance descending - merge into the largest token
      const sorted = [...tokens].sort((a, b) => b.balance - a.balance);
      const targetToken = sorted[0];
      const tokensToMerge = sorted.slice(1);

      // Merge each token into the target one by one
      for (const sourceToken of tokensToMerge) {
        const result = await service.mergeYesTokens({
          targetTokenId: targetToken.id,
          sourceTokenId: sourceToken.id,
          tokenType: 'yes',
        });

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to consolidate YES tokens');
        }
      }

      return { consolidated: tokens.length, targetTokenId: targetToken.id };
    },
    onSuccess: () => {
      invalidateAll();
      invalidatePortfolio();
      queryClient.invalidateQueries({ queryKey: tokenKeys.all });
    },
  });
}

/**
 * Consolidate all NO tokens into one (merge multiple tokens of same type)
 */
export function useConsolidateNoTokens() {
  const service = useTokenServiceWithSigner();
  const { invalidateAll, invalidatePortfolio } = useInvalidateTokens();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokens: NoToken[]) => {
      if (tokens.length < 2) {
        throw new Error('Need at least 2 tokens to consolidate');
      }

      // Sort by balance descending - merge into the largest token
      const sorted = [...tokens].sort((a, b) => b.balance - a.balance);
      const targetToken = sorted[0];
      const tokensToMerge = sorted.slice(1);

      // Merge each token into the target one by one
      for (const sourceToken of tokensToMerge) {
        const result = await service.mergeNoTokens({
          targetTokenId: targetToken.id,
          sourceTokenId: sourceToken.id,
          tokenType: 'no',
        });

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to consolidate NO tokens');
        }
      }

      return { consolidated: tokens.length, targetTokenId: targetToken.id };
    },
    onSuccess: () => {
      invalidateAll();
      invalidatePortfolio();
      queryClient.invalidateQueries({ queryKey: tokenKeys.all });
    },
  });
}

/**
 * Consolidate all tokens for a market (both YES and NO)
 */
export function useConsolidateAllTokens() {
  const consolidateYes = useConsolidateYesTokens();
  const consolidateNo = useConsolidateNoTokens();

  const consolidateAll = async (yesTokens: YesToken[], noTokens: NoToken[]) => {
    const results = { yes: false, no: false };

    if (yesTokens.length >= 2) {
      await consolidateYes.mutateAsync(yesTokens);
      results.yes = true;
    }

    if (noTokens.length >= 2) {
      await consolidateNo.mutateAsync(noTokens);
      results.no = true;
    }

    return results;
  };

  return {
    consolidateAll,
    consolidateYes,
    consolidateNo,
    isPending: consolidateYes.isPending || consolidateNo.isPending,
    isError: consolidateYes.isError || consolidateNo.isError,
    error: consolidateYes.error || consolidateNo.error,
  };
}
