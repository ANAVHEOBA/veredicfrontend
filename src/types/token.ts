// =============================================================================
// TOKEN MODULE TYPES
// =============================================================================

// =============================================================================
// BLOCKCHAIN TYPES (raw data from Sui)
// =============================================================================

/**
 * Raw YES token data as stored on-chain
 */
export interface YesTokenOnChain {
  id: string;
  market_id: string;
  balance: number;
}

/**
 * Raw NO token data as stored on-chain
 */
export interface NoTokenOnChain {
  id: string;
  market_id: string;
  balance: number;
}

/**
 * Raw token vault data as stored on-chain
 */
export interface TokenVaultOnChain {
  id: string;
  market_id: string;
  sui_balance: number;
  yes_supply: number;
  no_supply: number;
}

// =============================================================================
// FRONTEND TYPES (transformed for UI)
// =============================================================================

/**
 * YES token for frontend display
 */
export interface YesToken {
  id: string;
  marketId: string;
  balance: number;
  balanceFormatted: string; // e.g., "10.5 YES"
}

/**
 * NO token for frontend display
 */
export interface NoToken {
  id: string;
  marketId: string;
  balance: number;
  balanceFormatted: string; // e.g., "10.5 NO"
}

/**
 * Token vault for frontend display
 */
export interface TokenVault {
  id: string;
  marketId: string;
  suiBalance: number;
  suiBalanceFormatted: string; // e.g., "100.5 SUI"
  yesSupply: number;
  noSupply: number;
}

/**
 * User's position in a single market
 */
export interface MarketPosition {
  marketId: string;
  marketTitle?: string;
  yesTokens: YesToken[];
  noTokens: NoToken[];
  totalYesBalance: number;
  totalNoBalance: number;
  totalYesBalanceFormatted: string;
  totalNoBalanceFormatted: string;
  // Estimated value based on current prices
  estimatedValue?: number;
  estimatedValueFormatted?: string;
}

/**
 * User's portfolio across all markets
 */
export interface Portfolio {
  positions: MarketPosition[];
  totalPositions: number;
  totalValue: number;
  totalValueFormatted: string;
}

// =============================================================================
// PARAMS FOR TOKEN OPERATIONS
// =============================================================================

/**
 * Parameters for minting tokens
 */
export interface MintTokensParams {
  marketId: string;
  vaultId: string;
  amount: number; // in MIST
}

/**
 * Parameters for merging token set (YES + NO → SUI)
 */
export interface MergeTokenSetParams {
  marketId: string;
  vaultId: string;
  yesTokenId: string;
  noTokenId: string;
  amount: number;
}

/**
 * Parameters for redeeming winning tokens
 */
export interface RedeemTokensParams {
  marketId: string;
  vaultId: string;
  tokenId: string;
  tokenType: 'yes' | 'no';
}

/**
 * Parameters for redeeming voided market tokens
 */
export interface RedeemVoidedParams {
  marketId: string;
  vaultId: string;
  yesTokenId: string;
  noTokenId: string;
}

/**
 * Parameters for splitting a token
 */
export interface SplitTokenParams {
  tokenId: string;
  amount: number;
  tokenType: 'yes' | 'no';
}

/**
 * Parameters for merging tokens of same type
 */
export interface MergeTokensParams {
  targetTokenId: string;
  sourceTokenId: string;
  tokenType: 'yes' | 'no';
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Result from minting tokens
 */
export interface MintTokensResult {
  yesTokenId: string;
  noTokenId: string;
  amount: number;
}

/**
 * Result from redeeming tokens
 */
export interface RedeemTokensResult {
  suiAmount: number;
  suiAmountFormatted: string;
}
