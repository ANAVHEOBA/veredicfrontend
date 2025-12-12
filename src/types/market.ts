// =============================================================================
// BLOCKCHAIN TYPES (raw data from Sui)
// =============================================================================

/**
 * Raw market data as stored on-chain
 */
export interface MarketOnChain {
  id: string;
  market_id: number;
  question: string;
  description: string;
  image_url: string;
  category: string;
  tags: string[];
  outcome_yes_label: string;
  outcome_no_label: string;
  created_at: number;
  end_time: number;
  resolution_time: number;
  timeframe: string;
  resolution_type: number; // 0=ADMIN, 1=ORACLE
  resolution_source: string;
  winning_outcome: number; // 0=YES, 1=NO, 2=VOID, 255=UNSET
  resolved_at: number;
  resolver: string;
  total_volume: number;
  total_collateral: number;
  fee_bps: number;
  status: number; // 0=OPEN, 1=TRADING_ENDED, 2=RESOLVED, 3=VOIDED
  creator: string;
}

/**
 * Raw market registry data from chain
 */
export interface MarketRegistryOnChain {
  id: string;
  market_count: number;
  total_volume: number;
  total_collateral: number;
  creation_fee: number; // in MIST
  treasury: string;
  paused: boolean;
}

// =============================================================================
// FRONTEND TYPES (transformed for UI)
// =============================================================================

/**
 * Resolution type as readable string
 */
export type ResolutionType = 'admin' | 'oracle';

/**
 * Market status as readable string
 */
export type MarketStatus = 'open' | 'trading_ended' | 'resolved' | 'voided';

/**
 * Market outcome as readable string
 */
export type MarketOutcome = 'yes' | 'no' | null;

/**
 * Market data formatted for frontend display
 * All fields except id, title, volume, outcomes are optional for backward compatibility
 */
export interface Market {
  // Core identifiers (required)
  id: string;
  marketId: number; // numeric market_id from chain
  title: string; // mapped from question
  volume: string; // formatted e.g., "$1.2M"
  outcomes: Outcome[];

  // Optional blockchain fields
  description?: string;
  creator?: string;
  resolutionType?: ResolutionType;
  status?: MarketStatus;
  outcome?: MarketOutcome;
  endTime?: Date;
  resolvedAt?: Date | null;
  createdAt?: Date;
  volumeRaw?: number; // raw MIST value

  // UI display helpers
  category?: string;
  image?: string;

  // Live/event properties
  isLive?: boolean;
  liveLabel?: string;
  eventTime?: string;
}

/**
 * Outcome for market display
 */
export interface Outcome {
  id: string;
  name: string;
  price: number; // 0-100 percentage
  image?: string;
}

/**
 * Category for filtering
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

/**
 * Market card display type
 */
export type MarketCardType = 'default' | 'versus' | 'simple';

// =============================================================================
// PARAMS FOR CREATING/UPDATING
// =============================================================================

/**
 * Parameters for creating a new market
 */
export interface CreateMarketParams {
  question: string;
  description: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
  outcomeYesLabel?: string;
  outcomeNoLabel?: string;
  endTime: Date;
  resolutionTime?: Date;
  timeframe?: string;
  resolutionType: ResolutionType;
  resolutionSource?: string;
  feeBps?: number;
}

/**
 * Parameters for resolving a market
 */
export interface ResolveMarketParams {
  marketId: string;
  outcome: 'yes' | 'no';
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/**
 * Filters for querying markets
 */
export interface MarketFilters {
  status?: MarketStatus | MarketStatus[];
  creator?: string;
  category?: string;
  resolutionType?: ResolutionType;
  search?: string;
}

/**
 * Sort options for markets
 */
export type MarketSortBy = 'newest' | 'ending_soon' | 'volume' | 'trending';

/**
 * Query options for fetching markets
 */
export interface MarketQueryOptions {
  filters?: MarketFilters;
  sortBy?: MarketSortBy;
  limit?: number;
  offset?: number;
}
