'use client';

import { useQuery } from '@tanstack/react-query';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';

/**
 * Hook to get SUI balance for the current account
 */
export function useBalance() {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['balance', account?.address],
    queryFn: async () => {
      if (!account?.address) return null;

      const balance = await client.getBalance({
        owner: account.address,
        coinType: '0x2::sui::SUI',
      });

      return {
        raw: BigInt(balance.totalBalance),
        formatted: formatBalance(balance.totalBalance),
      };
    },
    enabled: !!account?.address,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Format balance from MIST to SUI with appropriate decimals
 */
function formatBalance(balanceInMist: string): string {
  const balance = BigInt(balanceInMist);
  const sui = Number(balance) / 1_000_000_000;

  if (sui >= 1000) {
    return `${(sui / 1000).toFixed(2)}K SUI`;
  }
  if (sui >= 1) {
    return `${sui.toFixed(2)} SUI`;
  }
  if (sui >= 0.01) {
    return `${sui.toFixed(3)} SUI`;
  }
  if (sui > 0) {
    return `${sui.toFixed(4)} SUI`;
  }
  return '0 SUI';
}
