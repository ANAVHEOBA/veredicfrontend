// =============================================================================
// WALLET HOOKS
// =============================================================================
// React Query hooks for the Proxy Wallet module

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { WalletService } from '@/services/wallet.service';
import type {
  DeployWalletParams,
  DepositSuiParams,
  WithdrawSuiParams,
  DepositTokenParams,
  WithdrawTokenParams,
  TransferOwnershipParams,
} from '@/types/wallet';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const walletKeys = {
  all: ['wallet'] as const,
  factory: () => [...walletKeys.all, 'factory'] as const,
  factoryById: (id: string) => [...walletKeys.factory(), id] as const,
  proxyWallet: (id: string) => [...walletKeys.all, 'proxyWallet', id] as const,
  userWallet: (address: string) => [...walletKeys.all, 'userWallet', address] as const,
  walletHistory: (walletId: string) => [...walletKeys.all, 'history', walletId] as const,
};

// =============================================================================
// SERVICE HOOKS
// =============================================================================

/**
 * Get wallet service (read-only, no signer)
 */
export function useWalletService() {
  const client = useSuiClient();
  return new WalletService(client);
}

/**
 * Get wallet service with signer for write operations
 */
export function useWalletServiceWithSigner() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  return new WalletService(client, async (tx) => {
    return await signAndExecute({ transaction: tx });
  });
}

// =============================================================================
// INVALIDATION HOOK
// =============================================================================

export function useInvalidateWallet() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
    invalidateFactory: () => queryClient.invalidateQueries({ queryKey: walletKeys.factory() }),
    invalidateProxyWallet: (id: string) =>
      queryClient.invalidateQueries({ queryKey: walletKeys.proxyWallet(id) }),
    invalidateUserWallet: (address: string) =>
      queryClient.invalidateQueries({ queryKey: walletKeys.userWallet(address) }),
    invalidateWalletHistory: (walletId: string) =>
      queryClient.invalidateQueries({ queryKey: walletKeys.walletHistory(walletId) }),
  };
}

// =============================================================================
// WALLET FACTORY QUERIES
// =============================================================================

/**
 * Find and get wallet factory
 */
export function useWalletFactory() {
  const service = useWalletService();

  return useQuery({
    queryKey: walletKeys.factory(),
    queryFn: async () => {
      const factoryId = await service.findWalletFactory();
      if (!factoryId) return null;
      return service.getWalletFactory(factoryId);
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Get wallet factory by ID
 */
export function useWalletFactoryById(factoryId: string | undefined) {
  const service = useWalletService();

  return useQuery({
    queryKey: walletKeys.factoryById(factoryId || ''),
    queryFn: () => service.getWalletFactory(factoryId!),
    enabled: !!factoryId,
    staleTime: 60_000,
  });
}

// =============================================================================
// PROXY WALLET QUERIES
// =============================================================================

/**
 * Get proxy wallet by ID
 */
export function useProxyWallet(walletId: string | undefined) {
  const service = useWalletService();

  return useQuery({
    queryKey: walletKeys.proxyWallet(walletId || ''),
    queryFn: () => service.getProxyWallet(walletId!),
    enabled: !!walletId,
    staleTime: 15_000, // 15 seconds
    refetchInterval: 30_000, // 30 seconds
  });
}

/**
 * Get current user's proxy wallet
 */
export function useUserProxyWallet() {
  const account = useCurrentAccount();
  const service = useWalletService();

  return useQuery({
    queryKey: walletKeys.userWallet(account?.address || ''),
    queryFn: () => service.getUserProxyWallet(account!.address),
    enabled: !!account?.address,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/**
 * Check if user has a proxy wallet
 */
export function useHasProxyWallet() {
  const account = useCurrentAccount();
  const service = useWalletService();

  return useQuery({
    queryKey: [...walletKeys.userWallet(account?.address || ''), 'exists'],
    queryFn: async () => {
      const walletId = await service.findUserProxyWallet(account!.address);
      return !!walletId;
    },
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

// =============================================================================
// HISTORY QUERIES
// =============================================================================

/**
 * Get wallet transaction history
 */
export function useWalletHistory(walletId: string | undefined, limit: number = 50) {
  const service = useWalletService();

  return useQuery({
    queryKey: walletKeys.walletHistory(walletId || ''),
    queryFn: () => service.getWalletHistory(walletId!, limit),
    enabled: !!walletId,
    staleTime: 30_000,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Deploy a new proxy wallet
 */
export function useDeployWallet() {
  const account = useCurrentAccount();
  const service = useWalletServiceWithSigner();
  const { invalidateUserWallet, invalidateFactory } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (params: DeployWalletParams) => {
      const result = await service.deployWallet(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to deploy wallet');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateUserWallet(account.address);
      }
      invalidateFactory();
    },
  });
}

/**
 * Deposit SUI into proxy wallet
 */
export function useDepositSui() {
  const service = useWalletServiceWithSigner();
  const { invalidateProxyWallet, invalidateWalletHistory } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (params: DepositSuiParams) => {
      const result = await service.depositSui(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to deposit SUI');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateProxyWallet(variables.walletId);
      invalidateWalletHistory(variables.walletId);
    },
  });
}

/**
 * Withdraw SUI from proxy wallet
 */
export function useWithdrawSui() {
  const service = useWalletServiceWithSigner();
  const { invalidateProxyWallet, invalidateWalletHistory } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (params: WithdrawSuiParams) => {
      const result = await service.withdrawSui(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to withdraw SUI');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateProxyWallet(variables.walletId);
      invalidateWalletHistory(variables.walletId);
    },
  });
}

/**
 * Deposit token into proxy wallet
 */
export function useDepositToken() {
  const service = useWalletServiceWithSigner();
  const { invalidateProxyWallet } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (params: DepositTokenParams) => {
      const result = await service.depositToken(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to deposit token');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateProxyWallet(variables.walletId);
    },
  });
}

/**
 * Withdraw token from proxy wallet
 */
export function useWithdrawToken() {
  const service = useWalletServiceWithSigner();
  const { invalidateProxyWallet } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (params: WithdrawTokenParams) => {
      const result = await service.withdrawToken(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to withdraw token');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateProxyWallet(variables.walletId);
    },
  });
}

/**
 * Lock proxy wallet
 */
export function useLockWallet() {
  const service = useWalletServiceWithSigner();
  const { invalidateProxyWallet } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (walletId: string) => {
      const result = await service.lockWallet(walletId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to lock wallet');
      }
      return result;
    },
    onSuccess: (_, walletId) => {
      invalidateProxyWallet(walletId);
    },
  });
}

/**
 * Unlock proxy wallet
 */
export function useUnlockWallet() {
  const service = useWalletServiceWithSigner();
  const { invalidateProxyWallet } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (walletId: string) => {
      const result = await service.unlockWallet(walletId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to unlock wallet');
      }
      return result;
    },
    onSuccess: (_, walletId) => {
      invalidateProxyWallet(walletId);
    },
  });
}

/**
 * Transfer wallet ownership
 */
export function useTransferWalletOwnership() {
  const account = useCurrentAccount();
  const service = useWalletServiceWithSigner();
  const { invalidateProxyWallet, invalidateUserWallet } = useInvalidateWallet();

  return useMutation({
    mutationFn: async (params: TransferOwnershipParams) => {
      const result = await service.transferOwnership(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to transfer ownership');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateProxyWallet(variables.walletId);
      if (account?.address) {
        invalidateUserWallet(account.address);
      }
      invalidateUserWallet(variables.newOwner);
    },
  });
}

// =============================================================================
// COMBINED HOOKS
// =============================================================================

/**
 * Get all proxy wallet data for current user
 */
export function useProxyWalletData() {
  const { data: factory, isLoading: factoryLoading } = useWalletFactory();
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useUserProxyWallet();
  const { data: history, isLoading: historyLoading } = useWalletHistory(wallet?.id);

  return {
    factory,
    wallet,
    history,
    isLoading: factoryLoading || walletLoading || historyLoading,
    refetchWallet,
    // Computed values
    hasWallet: !!wallet,
    isActive: wallet?.isActive ?? false,
    isLocked: wallet?.isLocked ?? false,
    suiBalance: wallet?.suiBalance ?? 0,
    suiBalanceFormatted: wallet?.suiBalanceFormatted ?? '0 SUI',
    deploymentFee: factory?.deploymentFee ?? 0,
    deploymentFeeFormatted: factory?.deploymentFeeFormatted ?? '0 SUI',
  };
}
