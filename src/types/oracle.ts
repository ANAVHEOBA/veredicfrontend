// =============================================================================
// ORACLE MODULE TYPES
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================

export const ORACLE_CONSTANTS = {
  // Request Status
  STATUS_PENDING: 0,
  STATUS_PROPOSED: 1,
  STATUS_DISPUTED: 2,
  STATUS_FINALIZED: 3,
  STATUS_CANCELLED: 4,

  // Provider Types
  PROVIDER_OPTIMISTIC: 0,
  PROVIDER_PRICE_FEED: 1,
  PROVIDER_API: 2,

  // Price Comparison Types
  COMPARE_GREATER: 0,
  COMPARE_LESS: 1,
  COMPARE_EQUAL: 2,
  COMPARE_GREATER_OR_EQUAL: 3,
  COMPARE_LESS_OR_EQUAL: 4,

  // Outcomes
  OUTCOME_YES: 0,
  OUTCOME_NO: 1,
  OUTCOME_UNSET: 255,

  // Defaults
  DEFAULT_BOND: 10_000_000, // 0.01 SUI in MIST
  DEFAULT_DISPUTE_WINDOW: 7_200_000, // 2 hours in ms
  MIN_BOND: 1_000_000, // 0.001 SUI
  MAX_DISPUTE_WINDOW: 86_400_000, // 24 hours in ms
} as const;

// Status name mapping
export const REQUEST_STATUS_NAMES: Record<number, string> = {
  [ORACLE_CONSTANTS.STATUS_PENDING]: 'Pending',
  [ORACLE_CONSTANTS.STATUS_PROPOSED]: 'Proposed',
  [ORACLE_CONSTANTS.STATUS_DISPUTED]: 'Disputed',
  [ORACLE_CONSTANTS.STATUS_FINALIZED]: 'Finalized',
  [ORACLE_CONSTANTS.STATUS_CANCELLED]: 'Cancelled',
};

// Provider type name mapping
export const PROVIDER_TYPE_NAMES: Record<number, string> = {
  [ORACLE_CONSTANTS.PROVIDER_OPTIMISTIC]: 'Optimistic',
  [ORACLE_CONSTANTS.PROVIDER_PRICE_FEED]: 'Price Feed',
  [ORACLE_CONSTANTS.PROVIDER_API]: 'API',
};

// Outcome name mapping
export const OUTCOME_NAMES: Record<number, string> = {
  [ORACLE_CONSTANTS.OUTCOME_YES]: 'YES',
  [ORACLE_CONSTANTS.OUTCOME_NO]: 'NO',
  [ORACLE_CONSTANTS.OUTCOME_UNSET]: 'Unset',
};

// Status colors for UI
export const REQUEST_STATUS_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  [ORACLE_CONSTANTS.STATUS_PENDING]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
  },
  [ORACLE_CONSTANTS.STATUS_PROPOSED]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  [ORACLE_CONSTANTS.STATUS_DISPUTED]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
  },
  [ORACLE_CONSTANTS.STATUS_FINALIZED]: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
  },
  [ORACLE_CONSTANTS.STATUS_CANCELLED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
};

// =============================================================================
// BLOCKCHAIN TYPES (raw data from Sui)
// =============================================================================

/**
 * Raw OracleRegistry data as stored on-chain
 */
export interface OracleRegistryOnChain {
  id: { id: string };
  admin: string;
  providers: { fields: { id: { id: string } } };
  default_bond: string;
  default_dispute_window: string;
  total_requests: string;
  active_requests: { fields: { id: { id: string } } };
}

/**
 * Raw OracleProvider data as stored on-chain
 */
export interface OracleProviderOnChain {
  name: string;
  provider_type: string;
  is_active: boolean;
  min_bond: string;
  dispute_window: string;
  total_resolutions: string;
}

/**
 * Raw ResolutionRequest data as stored on-chain
 */
export interface ResolutionRequestOnChain {
  id: { id: string };
  request_id: string;
  market_id: string;
  oracle_source: string;
  requester: string;
  requester_bond: { value: string };
  request_time: string;
  status: string;
  proposed_outcome: string;
  proposer: string;
  proposer_bond: { value: string };
  proposal_time: string;
  dispute_deadline: string;
  disputer: string;
  disputer_bond: { value: string };
  final_outcome: string;
  resolved_time: string;
}

// =============================================================================
// FRONTEND TYPES (transformed for UI)
// =============================================================================

/**
 * Oracle provider for frontend display
 */
export interface OracleProvider {
  name: string;
  providerType: number;
  providerTypeName: string;
  isActive: boolean;
  minBond: number;
  minBondFormatted: string;
  disputeWindow: number;
  disputeWindowFormatted: string;
  totalResolutions: number;
}

/**
 * Oracle registry for frontend display
 */
export interface OracleRegistry {
  id: string;
  admin: string;
  defaultBond: number;
  defaultBondFormatted: string;
  defaultDisputeWindow: number;
  defaultDisputeWindowFormatted: string;
  totalRequests: number;
}

/**
 * Resolution request for frontend display
 */
export interface ResolutionRequest {
  id: string;
  requestId: number;
  marketId: number;
  oracleSource: string;
  requester: string;
  requesterBond: number;
  requesterBondFormatted: string;
  requestTime: Date;
  status: number;
  statusName: string;
  proposedOutcome: number;
  proposedOutcomeName: string;
  proposer: string;
  proposerBond: number;
  proposerBondFormatted: string;
  proposalTime: Date | null;
  disputeDeadline: Date | null;
  disputer: string;
  disputerBond: number;
  disputerBondFormatted: string;
  finalOutcome: number;
  finalOutcomeName: string;
  resolvedTime: Date | null;
  // Computed fields
  isPending: boolean;
  isProposed: boolean;
  isDisputed: boolean;
  isFinalized: boolean;
  isCancelled: boolean;
  canPropose: boolean;
  canDispute: boolean;
  canFinalize: boolean;
  timeUntilDisputeDeadline: number | null;
}

// =============================================================================
// PARAMS FOR ORACLE OPERATIONS
// =============================================================================

/**
 * Parameters for requesting resolution
 */
export interface RequestResolutionParams {
  oracleRegistryId: string;
  marketId: string;
  bondAmount: number;
}

/**
 * Parameters for proposing outcome
 */
export interface ProposeOutcomeParams {
  oracleRegistryId: string;
  requestId: string;
  proposedOutcome: number; // 0 = YES, 1 = NO
  bondAmount: number;
}

/**
 * Parameters for disputing outcome
 */
export interface DisputeOutcomeParams {
  oracleRegistryId: string;
  requestId: string;
  bondAmount: number;
}

/**
 * Parameters for finalizing undisputed resolution
 */
export interface FinalizeUndisputedParams {
  oracleRegistryId: string;
  requestId: string;
  marketId: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface ResolutionRequestedEvent {
  requestId: number;
  marketId: number;
  requester: string;
  bond: number;
  timestamp: number;
}

export interface OutcomeProposedEvent {
  requestId: number;
  marketId: number;
  proposer: string;
  proposedOutcome: number;
  bond: number;
  disputeDeadline: number;
  timestamp: number;
}

export interface OutcomeDisputedEvent {
  requestId: number;
  marketId: number;
  disputer: string;
  bond: number;
  timestamp: number;
}

export interface ResolutionFinalizedEvent {
  requestId: number;
  marketId: number;
  finalOutcome: number;
  resolvedBy: string;
  timestamp: number;
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const ORACLE_ERRORS: Record<number, string> = {
  400: 'Not authorized',
  401: 'Provider not found',
  402: 'Provider not active',
  403: 'Request not found',
  404: 'Invalid request status',
  405: 'Insufficient bond',
  406: 'Market already has active request',
  407: 'Dispute window not passed',
  408: 'Dispute window passed',
  409: 'Invalid outcome',
  410: 'Market not resolved by oracle',
  411: 'Already proposed',
  412: 'Already disputed',
  413: 'Cannot dispute own proposal',
};
