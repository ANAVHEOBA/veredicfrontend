// =============================================================================
// WALLET MODULE TYPES
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================

export const WALLET_CONSTANTS = {
  // Approval Scopes
  SCOPE_NONE: 0,
  SCOPE_TRADE: 1,
  SCOPE_TRANSFER: 2,
  SCOPE_LIQUIDITY: 3,
  SCOPE_ALL: 255,

  // Wallet Status
  STATUS_ACTIVE: 0,
  STATUS_LOCKED: 1,

  // Action Types
  ACTION_TRANSFER_SUI: 1,
  ACTION_TRANSFER_YES: 2,
  ACTION_TRANSFER_NO: 3,
  ACTION_TRANSFER_LP: 4,
  ACTION_PLACE_ORDER: 10,
  ACTION_CANCEL_ORDER: 11,
  ACTION_ADD_LIQUIDITY: 20,
  ACTION_REMOVE_LIQUIDITY: 21,
  ACTION_SWAP: 22,

  // Signature Schemes
  SIG_SCHEME_ED25519: 0,
  SIG_SCHEME_SECP256K1: 1,
} as const;

// Scope name mapping
export const SCOPE_NAMES: Record<number, string> = {
  [WALLET_CONSTANTS.SCOPE_NONE]: 'None',
  [WALLET_CONSTANTS.SCOPE_TRADE]: 'Trade',
  [WALLET_CONSTANTS.SCOPE_TRANSFER]: 'Transfer',
  [WALLET_CONSTANTS.SCOPE_LIQUIDITY]: 'Liquidity',
  [WALLET_CONSTANTS.SCOPE_ALL]: 'All',
};

// Status name mapping
export const WALLET_STATUS_NAMES: Record<number, string> = {
  [WALLET_CONSTANTS.STATUS_ACTIVE]: 'Active',
  [WALLET_CONSTANTS.STATUS_LOCKED]: 'Locked',
};

// Action type name mapping
export const ACTION_TYPE_NAMES: Record<number, string> = {
  [WALLET_CONSTANTS.ACTION_TRANSFER_SUI]: 'Transfer SUI',
  [WALLET_CONSTANTS.ACTION_TRANSFER_YES]: 'Transfer YES',
  [WALLET_CONSTANTS.ACTION_TRANSFER_NO]: 'Transfer NO',
  [WALLET_CONSTANTS.ACTION_TRANSFER_LP]: 'Transfer LP',
  [WALLET_CONSTANTS.ACTION_PLACE_ORDER]: 'Place Order',
  [WALLET_CONSTANTS.ACTION_CANCEL_ORDER]: 'Cancel Order',
  [WALLET_CONSTANTS.ACTION_ADD_LIQUIDITY]: 'Add Liquidity',
  [WALLET_CONSTANTS.ACTION_REMOVE_LIQUIDITY]: 'Remove Liquidity',
  [WALLET_CONSTANTS.ACTION_SWAP]: 'Swap',
};

// Status colors for UI
export const WALLET_STATUS_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  [WALLET_CONSTANTS.STATUS_ACTIVE]: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
  },
  [WALLET_CONSTANTS.STATUS_LOCKED]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
  },
};

// =============================================================================
// BLOCKCHAIN TYPES (raw data from Sui)
// =============================================================================

/**
 * Raw ProxyWallet data as stored on-chain
 */
export interface ProxyWalletOnChain {
  id: { id: string };
  owner: string;
  nonce: string;
  created_at: string;
  status: string;
  sui_balance: { value: string };
  yes_tokens: { fields: { id: { id: string } } };
  no_tokens: { fields: { id: { id: string } } };
  lp_tokens: { fields: { id: { id: string } } };
  approvals: { fields: { id: { id: string } } };
}

/**
 * Raw WalletFactory data as stored on-chain
 */
export interface WalletFactoryOnChain {
  id: { id: string };
  admin: string;
  wallet_count: string;
  wallet_registry: { fields: { id: { id: string } } };
  deployment_fee: string;
  collected_fees: { value: string };
}

/**
 * Raw Approval data as stored on-chain
 */
export interface ApprovalOnChain {
  operator: string;
  scope: string;
  limit: string;
  expiry: string;
  used: string;
}

// =============================================================================
// FRONTEND TYPES (transformed for UI)
// =============================================================================

/**
 * Proxy wallet for frontend display
 */
export interface ProxyWallet {
  id: string;
  owner: string;
  nonce: number;
  createdAt: Date;
  status: number;
  statusName: string;
  suiBalance: number;
  suiBalanceFormatted: string;
  // Token counts (actual tokens fetched separately)
  yesTokenMarketIds: number[];
  noTokenMarketIds: number[];
  lpTokenMarketIds: number[];
  // Computed fields
  isActive: boolean;
  isLocked: boolean;
}

/**
 * Wallet factory for frontend display
 */
export interface WalletFactory {
  id: string;
  admin: string;
  walletCount: number;
  deploymentFee: number;
  deploymentFeeFormatted: string;
  collectedFees: number;
  collectedFeesFormatted: string;
}

/**
 * Operator approval for frontend display
 */
export interface Approval {
  operator: string;
  scope: number;
  scopeName: string;
  limit: number;
  limitFormatted: string;
  expiry: Date | null;
  used: number;
  usedFormatted: string;
  remaining: number;
  remainingFormatted: string;
  // Computed fields
  isValid: boolean;
  isExpired: boolean;
  percentUsed: number;
}

/**
 * Token balance in proxy wallet
 */
export interface WalletTokenBalance {
  marketId: number;
  yesBalance: number;
  yesBalanceFormatted: string;
  noBalance: number;
  noBalanceFormatted: string;
  lpBalance: number;
  lpBalanceFormatted: string;
}

// =============================================================================
// PARAMS FOR WALLET OPERATIONS
// =============================================================================

/**
 * Parameters for deploying a wallet
 */
export interface DeployWalletParams {
  factoryId: string;
  paymentAmount: number;
}

/**
 * Parameters for depositing SUI
 */
export interface DepositSuiParams {
  walletId: string;
  amount: number;
}

/**
 * Parameters for withdrawing SUI
 */
export interface WithdrawSuiParams {
  walletId: string;
  amount: number;
  recipient?: string; // If not provided, withdraws to owner
}

/**
 * Parameters for depositing tokens
 */
export interface DepositTokenParams {
  walletId: string;
  tokenId: string;
  tokenType: 'yes' | 'no' | 'lp';
}

/**
 * Parameters for withdrawing tokens
 */
export interface WithdrawTokenParams {
  walletId: string;
  marketId: number;
  tokenType: 'yes' | 'no' | 'lp';
  recipient?: string;
}

/**
 * Parameters for granting approval
 */
export interface GrantApprovalParams {
  walletId: string;
  operator: string;
  scope: number;
  limit: number;
  expiry?: number; // Timestamp, 0 = no expiry
}

/**
 * Parameters for revoking approval
 */
export interface RevokeApprovalParams {
  walletId: string;
  operator: string;
}

/**
 * Parameters for transferring ownership
 */
export interface TransferOwnershipParams {
  walletId: string;
  newOwner: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface WalletDeployedEvent {
  walletId: string;
  owner: string;
  timestamp: number;
}

export interface WalletLockedEvent {
  walletId: string;
  owner: string;
  timestamp: number;
}

export interface WalletUnlockedEvent {
  walletId: string;
  owner: string;
  timestamp: number;
}

export interface SuiDepositedEvent {
  walletId: string;
  amount: number;
  depositor: string;
  timestamp: number;
}

export interface SuiWithdrawnEvent {
  walletId: string;
  amount: number;
  recipient: string;
  timestamp: number;
}

export interface ApprovalGrantedEvent {
  walletId: string;
  operator: string;
  scope: number;
  limit: number;
  expiry: number;
  timestamp: number;
}

export interface ApprovalRevokedEvent {
  walletId: string;
  operator: string;
  timestamp: number;
}

export interface OwnershipTransferredEvent {
  walletId: string;
  previousOwner: string;
  newOwner: string;
  timestamp: number;
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const WALLET_ERRORS: Record<number, string> = {
  500: 'Not wallet owner',
  501: 'Wallet is locked',
  502: 'Wallet already exists for user',
  503: 'Insufficient deployment fee',
  504: 'Insufficient SUI balance',
  505: 'Token not found in wallet',
  506: 'Approval not found',
  507: 'Approval expired',
  508: 'Approval limit exceeded',
  509: 'Invalid scope for action',
  510: 'Not authorized operator',
  511: 'Invalid signature',
  512: 'Transaction expired',
  513: 'Invalid nonce',
  514: 'Factory not initialized',
};
