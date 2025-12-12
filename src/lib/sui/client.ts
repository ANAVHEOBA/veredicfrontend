import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { NETWORK, RPC_URLS } from '@/lib/config';

/**
 * Singleton SuiClient instance
 * Use this for all direct Sui RPC calls outside of React components
 */
let suiClientInstance: SuiClient | null = null;

/**
 * Get the SuiClient singleton instance
 */
export function getSuiClient(): SuiClient {
  if (!suiClientInstance) {
    suiClientInstance = new SuiClient({
      url: RPC_URLS[NETWORK] || getFullnodeUrl(NETWORK),
    });
  }
  return suiClientInstance;
}

/**
 * Create a new SuiClient with a specific network
 * Use this when you need a client for a different network
 */
export function createSuiClient(network: 'mainnet' | 'testnet' | 'devnet'): SuiClient {
  return new SuiClient({
    url: RPC_URLS[network] || getFullnodeUrl(network),
  });
}

/**
 * Reset the singleton (useful for testing or network switching)
 */
export function resetSuiClient(): void {
  suiClientInstance = null;
}

// Export a default client for convenience
export const suiClient = getSuiClient();
