// =============================================================================
// FEE HOOKS
// =============================================================================
// React Query hooks for the Fee module

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { FeeService } from '@/services/fee.service';
import type {
  CreateReferralCodeParams,
  UseReferralCodeParams,
  SetCustomCreatorFeeParams,
} from '@/types/fee';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const feeKeys = {
  all: ['fee'] as const,
  registry: () => [...feeKeys.all, 'registry'] as const,
  registryById: (id: string) => [...feeKeys.registry(), id] as const,
  referralRegistry: () => [...feeKeys.all, 'referralRegistry'] as const,
  userStats: (address: string) => [...feeKeys.all, 'userStats', address] as const,
  userStatsById: (id: string) => [...feeKeys.all, 'userStats', 'byId', id] as const,
  creatorConfig: (address: string) => [...feeKeys.all, 'creatorConfig', address] as const,
  creatorConfigById: (id: string) => [...feeKeys.all, 'creatorConfig', 'byId', id] as const,
  referralConfig: (address: string) => [...feeKeys.all, 'referralConfig', address] as const,
  referralConfigById: (id: string) => [...feeKeys.all, 'referralConfig', 'byId', id] as const,
  referralEarnings: (address: string) => [...feeKeys.all, 'referralEarnings', address] as const,
  creatorEarnings: (address: string) => [...feeKeys.all, 'creatorEarnings', address] as const,
  feeHistory: (address: string) => [...feeKeys.all, 'feeHistory', address] as const,
};

// =============================================================================
// SERVICE HOOKS
// =============================================================================

/**
 * Get fee service (read-only, no signer)
 */
export function useFeeService() {
  const client = useSuiClient();
  return new FeeService(client);
}

/**
 * Get fee service with signer for write operations
 */
export function useFeeServiceWithSigner() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  return new FeeService(client, async (tx) => {
    return await signAndExecute({ transaction: tx });
  });
}

// =============================================================================
// INVALIDATION HOOK
// =============================================================================

export function useInvalidateFees() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
    invalidateUserStats: (address: string) =>
      queryClient.invalidateQueries({ queryKey: feeKeys.userStats(address) }),
    invalidateCreatorConfig: (address: string) =>
      queryClient.invalidateQueries({ queryKey: feeKeys.creatorConfig(address) }),
    invalidateReferralConfig: (address: string) =>
      queryClient.invalidateQueries({ queryKey: feeKeys.referralConfig(address) }),
  };
}

// =============================================================================
// FEE REGISTRY QUERIES
// =============================================================================

/**
 * Find and get fee registry
 */
export function useFeeRegistry() {
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.registry(),
    queryFn: async () => {
      const registryId = await service.findFeeRegistry();
      if (!registryId) return null;
      return service.getFeeRegistry(registryId);
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Get fee registry by ID
 */
export function useFeeRegistryById(registryId: string | undefined) {
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.registryById(registryId || ''),
    queryFn: () => service.getFeeRegistry(registryId!),
    enabled: !!registryId,
    staleTime: 60_000,
  });
}

/**
 * Find referral registry ID
 */
export function useReferralRegistry() {
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.referralRegistry(),
    queryFn: () => service.findReferralRegistry(),
    staleTime: 300_000, // 5 minutes (doesn't change often)
  });
}

// =============================================================================
// USER FEE STATS QUERIES
// =============================================================================

/**
 * Get current user's fee stats
 */
export function useUserFeeStats() {
  const account = useCurrentAccount();
  const service = useFeeService();
  const { data: registry } = useFeeRegistry();

  return useQuery({
    queryKey: feeKeys.userStats(account?.address || ''),
    queryFn: () => service.getUserFeeStatsForAddress(account!.address, registry || undefined),
    enabled: !!account?.address,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  });
}

/**
 * Get fee stats for any address
 */
export function useFeeStatsForAddress(address: string | undefined) {
  const service = useFeeService();
  const { data: registry } = useFeeRegistry();

  return useQuery({
    queryKey: feeKeys.userStats(address || ''),
    queryFn: () => service.getUserFeeStatsForAddress(address!, registry || undefined),
    enabled: !!address,
    staleTime: 30_000,
  });
}

/**
 * Get fee stats by ID
 */
export function useUserFeeStatsById(statsId: string | undefined) {
  const service = useFeeService();
  const { data: registry } = useFeeRegistry();

  return useQuery({
    queryKey: feeKeys.userStatsById(statsId || ''),
    queryFn: () => service.getUserFeeStats(statsId!, registry || undefined),
    enabled: !!statsId,
    staleTime: 30_000,
  });
}

/**
 * Check if user has fee stats
 */
export function useHasUserFeeStats() {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: [...feeKeys.userStats(account?.address || ''), 'exists'],
    queryFn: async () => {
      const statsId = await service.findUserFeeStats(account!.address);
      return !!statsId;
    },
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

// =============================================================================
// CREATOR FEE CONFIG QUERIES
// =============================================================================

/**
 * Get current user's creator fee config
 */
export function useCreatorFeeConfig() {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.creatorConfig(account?.address || ''),
    queryFn: () => service.getCreatorFeeConfigForAddress(account!.address),
    enabled: !!account?.address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Get creator config for any address
 */
export function useCreatorConfigForAddress(address: string | undefined) {
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.creatorConfig(address || ''),
    queryFn: () => service.getCreatorFeeConfigForAddress(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
}

/**
 * Get creator config by ID
 */
export function useCreatorFeeConfigById(configId: string | undefined) {
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.creatorConfigById(configId || ''),
    queryFn: () => service.getCreatorFeeConfig(configId!),
    enabled: !!configId,
    staleTime: 30_000,
  });
}

/**
 * Check if user has creator config
 */
export function useHasCreatorConfig() {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: [...feeKeys.creatorConfig(account?.address || ''), 'exists'],
    queryFn: async () => {
      const configId = await service.findCreatorFeeConfig(account!.address);
      return !!configId;
    },
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

// =============================================================================
// REFERRAL CONFIG QUERIES
// =============================================================================

/**
 * Get current user's referral config
 */
export function useReferralConfig() {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.referralConfig(account?.address || ''),
    queryFn: () => service.getReferralConfigForAddress(account!.address),
    enabled: !!account?.address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Get referral config for any address
 */
export function useReferralConfigForAddress(address: string | undefined) {
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.referralConfig(address || ''),
    queryFn: () => service.getReferralConfigForAddress(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
}

/**
 * Get referral config by ID
 */
export function useReferralConfigById(configId: string | undefined) {
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.referralConfigById(configId || ''),
    queryFn: () => service.getReferralConfig(configId!),
    enabled: !!configId,
    staleTime: 30_000,
  });
}

/**
 * Check if user has referral config
 */
export function useHasReferralConfig() {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: [...feeKeys.referralConfig(account?.address || ''), 'exists'],
    queryFn: async () => {
      const configId = await service.findReferralConfig(account!.address);
      return !!configId;
    },
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

// =============================================================================
// HISTORY QUERIES
// =============================================================================

/**
 * Get referral earnings history
 */
export function useReferralEarningsHistory(limit: number = 50) {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.referralEarnings(account?.address || ''),
    queryFn: () => service.getReferralEarningsHistory(account!.address, limit),
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

/**
 * Get creator earnings history
 */
export function useCreatorEarningsHistory(limit: number = 50) {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.creatorEarnings(account?.address || ''),
    queryFn: () => service.getCreatorEarningsHistory(account!.address, limit),
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

/**
 * Get user's fee payment history
 */
export function useFeeHistory(limit: number = 50) {
  const account = useCurrentAccount();
  const service = useFeeService();

  return useQuery({
    queryKey: feeKeys.feeHistory(account?.address || ''),
    queryFn: () => service.getFeeHistory(account!.address, limit),
    enabled: !!account?.address,
    staleTime: 60_000,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create user fee stats
 */
export function useCreateUserStats() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateUserStats } = useInvalidateFees();

  return useMutation({
    mutationFn: async () => {
      const result = await service.createUserStats();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create user stats');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateUserStats(account.address);
      }
    },
  });
}

/**
 * Create creator fee config
 */
export function useCreateCreatorConfig() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateCreatorConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async () => {
      const result = await service.createCreatorConfig();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create creator config');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateCreatorConfig(account.address);
      }
    },
  });
}

/**
 * Set custom creator fee
 */
export function useSetCustomCreatorFee() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateCreatorConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async (params: SetCustomCreatorFeeParams) => {
      const result = await service.setCustomCreatorFee(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to set custom creator fee');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateCreatorConfig(account.address);
      }
    },
  });
}

/**
 * Clear custom creator fee
 */
export function useClearCustomCreatorFee() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateCreatorConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async (creatorConfigId: string) => {
      const result = await service.clearCustomCreatorFee(creatorConfigId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to clear custom creator fee');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateCreatorConfig(account.address);
      }
    },
  });
}

/**
 * Create referral code
 */
export function useCreateReferralCode() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateReferralConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async (params: CreateReferralCodeParams) => {
      const result = await service.createReferralCode(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create referral code');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateReferralConfig(account.address);
      }
    },
  });
}

/**
 * Use referral code
 */
export function useUseReferralCode() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateUserStats, invalidateReferralConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async (params: UseReferralCodeParams) => {
      const result = await service.useReferralCode(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to use referral code');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateUserStats(account.address);
        invalidateReferralConfig(account.address);
      }
    },
  });
}

/**
 * Deactivate referral code
 */
export function useDeactivateReferralCode() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateReferralConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async (referralConfigId: string) => {
      const result = await service.deactivateReferralCode(referralConfigId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to deactivate referral code');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateReferralConfig(account.address);
      }
    },
  });
}

/**
 * Claim creator earnings
 */
export function useClaimCreatorEarnings() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateCreatorConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async (creatorConfigId: string) => {
      const result = await service.claimCreatorEarnings(creatorConfigId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to claim creator earnings');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateCreatorConfig(account.address);
      }
    },
  });
}

/**
 * Claim referral earnings
 */
export function useClaimReferralEarnings() {
  const account = useCurrentAccount();
  const service = useFeeServiceWithSigner();
  const { invalidateReferralConfig } = useInvalidateFees();

  return useMutation({
    mutationFn: async (referralConfigId: string) => {
      const result = await service.claimReferralEarnings(referralConfigId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to claim referral earnings');
      }
      return result;
    },
    onSuccess: () => {
      if (account?.address) {
        invalidateReferralConfig(account.address);
      }
    },
  });
}

// =============================================================================
// COMBINED HOOKS
// =============================================================================

/**
 * Get all user fee-related data
 */
export function useUserFeeData() {
  const { data: registry, isLoading: registryLoading } = useFeeRegistry();
  const { data: userStats, isLoading: statsLoading } = useUserFeeStats();
  const { data: creatorConfig, isLoading: creatorLoading } = useCreatorFeeConfig();
  const { data: referralConfig, isLoading: referralLoading } = useReferralConfig();

  return {
    registry,
    userStats,
    creatorConfig,
    referralConfig,
    isLoading: registryLoading || statsLoading || creatorLoading || referralLoading,
    // Computed values
    hasUserStats: !!userStats,
    hasCreatorConfig: !!creatorConfig,
    hasReferralConfig: !!referralConfig,
    currentTierName: userStats?.currentTierName || 'Bronze',
    effectiveFeePercent: userStats?.effectiveFeePercent ?? registry?.baseFeePercent ?? 1,
    totalEarnings: (creatorConfig?.earnings || 0) + (referralConfig?.earnings || 0),
  };
}
