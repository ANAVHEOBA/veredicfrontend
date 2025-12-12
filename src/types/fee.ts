// =============================================================================
// FEE MODULE TYPES
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================

export const FEE_CONSTANTS = {
  // Fee Limits
  MAX_FEE_BPS: 1000, // 10% max fee
  MIN_FEE_BPS: 0, // 0% min fee
  MAX_MAKER_REBATE_BPS: 50, // 0.5% max rebate
  BPS_PRECISION: 10000, // 100% = 10000 basis points

  // Default Shares (sum to 10000)
  DEFAULT_PROTOCOL_SHARE_BPS: 5000, // 50%
  DEFAULT_CREATOR_SHARE_BPS: 4000, // 40%
  DEFAULT_REFERRAL_SHARE_BPS: 1000, // 10%

  // Default Rates
  DEFAULT_BASE_FEE_BPS: 100, // 1%
  DEFAULT_MAKER_REBATE_BPS: 5, // 0.05%

  // Volume Window
  VOLUME_WINDOW_MS: 2_592_000_000, // 30 days in ms

  // Referral
  MAX_REFERRAL_CODE_LENGTH: 20,
  MIN_REFERRAL_CODE_LENGTH: 4,

  // Tier Indices
  TIER_BRONZE: 0,
  TIER_SILVER: 1,
  TIER_GOLD: 2,
  TIER_PLATINUM: 3,
  TIER_DIAMOND: 4,
} as const;

// Tier names mapping
export const TIER_NAMES: Record<number, string> = {
  [FEE_CONSTANTS.TIER_BRONZE]: 'Bronze',
  [FEE_CONSTANTS.TIER_SILVER]: 'Silver',
  [FEE_CONSTANTS.TIER_GOLD]: 'Gold',
  [FEE_CONSTANTS.TIER_PLATINUM]: 'Platinum',
  [FEE_CONSTANTS.TIER_DIAMOND]: 'Diamond',
};

// Tier colors for UI
export const TIER_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  [FEE_CONSTANTS.TIER_BRONZE]: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
  },
  [FEE_CONSTANTS.TIER_SILVER]: {
    bg: 'bg-gray-200',
    text: 'text-gray-700',
    border: 'border-gray-400',
  },
  [FEE_CONSTANTS.TIER_GOLD]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-400',
  },
  [FEE_CONSTANTS.TIER_PLATINUM]: {
    bg: 'bg-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-400',
  },
  [FEE_CONSTANTS.TIER_DIAMOND]: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-400',
  },
};

// =============================================================================
// BLOCKCHAIN TYPES (raw data from Sui)
// =============================================================================

/**
 * Raw FeeRegistry data as stored on-chain
 */
export interface FeeRegistryOnChain {
  id: { id: string };
  admin: string;
  protocol_treasury: string;
  base_fee_bps: string;
  protocol_share_bps: string;
  creator_share_bps: string;
  referral_share_bps: string;
  maker_rebate_bps: string;
  tiers: FeeTierOnChain[];
  total_fees_collected: string;
  paused: boolean;
}

/**
 * Raw FeeTier data as stored on-chain
 */
export interface FeeTierOnChain {
  name: string;
  min_volume: string;
  fee_bps: string;
  maker_rebate_bps: string;
}

/**
 * Raw UserFeeStats data as stored on-chain
 */
export interface UserFeeStatsOnChain {
  id: { id: string };
  user: string;
  volume_30d: string;
  volume_lifetime: string;
  fees_paid: string;
  rebates_earned: string;
  referral_earnings: string;
  current_tier: string;
  last_updated: string;
}

/**
 * Raw CreatorFeeConfig data as stored on-chain
 */
export interface CreatorFeeConfigOnChain {
  id: { id: string };
  creator: string;
  custom_fee_bps: { vec: string[] } | null;
  earnings: string;
  total_earned: string;
  market_count: string;
}

/**
 * Raw ReferralConfig data as stored on-chain
 */
export interface ReferralConfigOnChain {
  id: { id: string };
  referrer: string;
  referral_code: string;
  referred_users: string[];
  earnings: string;
  total_earned: string;
  is_active: boolean;
}

/**
 * Raw ReferralRegistry data as stored on-chain
 */
export interface ReferralRegistryOnChain {
  id: { id: string };
  codes: { fields: { id: { id: string } } };
  user_referrers: { fields: { id: { id: string } } };
}

/**
 * Raw UserReferralLink data as stored on-chain
 */
export interface UserReferralLinkOnChain {
  id: { id: string };
  user: string;
  referrer: string;
  linked_at: string;
}

// =============================================================================
// FRONTEND TYPES (transformed for UI)
// =============================================================================

/**
 * Fee tier for frontend display
 */
export interface FeeTier {
  name: string;
  minVolume: number; // in MIST
  minVolumeFormatted: string;
  feeBps: number;
  feePercent: number; // 0-100
  makerRebateBps: number;
  makerRebatePercent: number;
}

/**
 * Fee registry for frontend display
 */
export interface FeeRegistry {
  id: string;
  admin: string;
  protocolTreasury: string;
  baseFeeBps: number;
  baseFeePercent: number;
  protocolShareBps: number;
  protocolSharePercent: number;
  creatorShareBps: number;
  creatorSharePercent: number;
  referralShareBps: number;
  referralSharePercent: number;
  makerRebateBps: number;
  makerRebatePercent: number;
  tiers: FeeTier[];
  totalFeesCollected: number;
  totalFeesFormatted: string;
  isPaused: boolean;
}

/**
 * User fee stats for frontend display
 */
export interface UserFeeStats {
  id: string;
  user: string;
  volume30d: number;
  volume30dFormatted: string;
  volumeLifetime: number;
  volumeLifetimeFormatted: string;
  feesPaid: number;
  feesPaidFormatted: string;
  rebatesEarned: number;
  rebatesEarnedFormatted: string;
  referralEarnings: number;
  referralEarningsFormatted: string;
  currentTier: number;
  currentTierName: string;
  lastUpdated: Date;
  // Calculated fields
  effectiveFeeBps: number;
  effectiveFeePercent: number;
  nextTier: FeeTier | null;
  volumeToNextTier: number;
  volumeToNextTierFormatted: string;
}

/**
 * Creator fee config for frontend display
 */
export interface CreatorFeeConfig {
  id: string;
  creator: string;
  customFeeBps: number | null;
  customFeePercent: number | null;
  earnings: number;
  earningsFormatted: string;
  totalEarned: number;
  totalEarnedFormatted: string;
  marketCount: number;
}

/**
 * Referral config for frontend display
 */
export interface ReferralConfig {
  id: string;
  referrer: string;
  referralCode: string;
  referredCount: number;
  earnings: number;
  earningsFormatted: string;
  totalEarned: number;
  totalEarnedFormatted: string;
  isActive: boolean;
}

/**
 * User referral link for frontend display
 */
export interface UserReferralLink {
  id: string;
  user: string;
  referrer: string;
  linkedAt: Date;
}

// =============================================================================
// PARAMS FOR FEE OPERATIONS
// =============================================================================

/**
 * Parameters for creating a referral code
 */
export interface CreateReferralCodeParams {
  referralRegistryId: string;
  code: string;
}

/**
 * Parameters for using a referral code
 */
export interface UseReferralCodeParams {
  referralRegistryId: string;
  referralConfigId: string;
  code: string;
}

/**
 * Parameters for setting custom creator fee
 */
export interface SetCustomCreatorFeeParams {
  creatorConfigId: string;
  feeBps: number;
}

/**
 * Parameters for claiming creator earnings
 */
export interface ClaimCreatorEarningsParams {
  creatorConfigId: string;
}

/**
 * Parameters for claiming referral earnings
 */
export interface ClaimReferralEarningsParams {
  referralConfigId: string;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Result from creating user stats
 */
export interface CreateUserStatsResult {
  userStatsId: string;
  transactionDigest: string;
}

/**
 * Result from creating referral code
 */
export interface CreateReferralCodeResult {
  referralConfigId: string;
  code: string;
  transactionDigest: string;
}

/**
 * Result from using referral code
 */
export interface UseReferralCodeResult {
  referralLinkId: string;
  referrer: string;
  transactionDigest: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface UserStatsCreatedEvent {
  user: string;
  timestamp: number;
}

export interface ReferralCodeCreatedEvent {
  referrer: string;
  code: string;
  timestamp: number;
}

export interface ReferralCodeUsedEvent {
  user: string;
  referrer: string;
  code: string;
  timestamp: number;
}

export interface CreatorEarningsAddedEvent {
  creator: string;
  amount: number;
  marketId: number;
  timestamp: number;
}

export interface ReferralEarningsAddedEvent {
  referrer: string;
  amount: number;
  referredUser: string;
  timestamp: number;
}

export interface FeeCollectedEvent {
  marketId: number;
  trader: string;
  totalFee: number;
  protocolShare: number;
  creatorShare: number;
  referralShare: number;
  timestamp: number;
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const FEE_ERRORS: Record<number, string> = {
  300: 'Not authorized',
  301: 'Fee too high',
  302: 'Fee too low',
  303: 'Invalid share distribution',
  304: 'Referral code too short',
  305: 'Referral code too long',
  306: 'Referral code already exists',
  307: 'Referral code not found',
  308: 'Already has referrer',
  309: 'Cannot refer yourself',
  310: 'Referral code inactive',
  311: 'No earnings to claim',
  312: 'Fee collection paused',
  313: 'Not creator owner',
  314: 'Not referrer owner',
  315: 'User stats already exist',
};
