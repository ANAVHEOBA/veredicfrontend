// =============================================================================
// FEE SERVICE
// =============================================================================
// Handles all fee-related operations: User Stats, Creator Config, Referrals

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG } from '@/lib/config';
import {
  type FeeRegistry,
  type FeeTier,
  type UserFeeStats,
  type CreatorFeeConfig,
  type ReferralConfig,
  type FeeRegistryOnChain,
  type UserFeeStatsOnChain,
  type CreatorFeeConfigOnChain,
  type ReferralConfigOnChain,
  type CreateReferralCodeParams,
  type UseReferralCodeParams,
  type SetCustomCreatorFeeParams,
  FEE_CONSTANTS,
  TIER_NAMES,
  FEE_ERRORS,
} from '@/types/fee';

const { PACKAGE_ID } = CONTRACT_CONFIG;
const CLOCK_ID = '0x6';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatBalance(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (sui >= 1_000_000) return `${(sui / 1_000_000).toFixed(2)}M`;
  if (sui >= 1_000) return `${(sui / 1_000).toFixed(2)}K`;
  if (sui >= 1) return sui.toFixed(4);
  return sui.toFixed(6);
}

function bpsToPercent(bps: number): number {
  return bps / 100;
}

function transformFeeTier(raw: any): FeeTier {
  const minVolume = Number(raw.min_volume || 0);
  const feeBps = Number(raw.fee_bps || 0);
  const makerRebateBps = Number(raw.maker_rebate_bps || 0);

  return {
    name: raw.name || 'Unknown',
    minVolume,
    minVolumeFormatted: formatBalance(minVolume),
    feeBps,
    feePercent: bpsToPercent(feeBps),
    makerRebateBps,
    makerRebatePercent: bpsToPercent(makerRebateBps),
  };
}

function transformFeeRegistry(id: string, raw: FeeRegistryOnChain): FeeRegistry {
  const baseFeeBps = Number(raw.base_fee_bps || 0);
  const protocolShareBps = Number(raw.protocol_share_bps || 0);
  const creatorShareBps = Number(raw.creator_share_bps || 0);
  const referralShareBps = Number(raw.referral_share_bps || 0);
  const makerRebateBps = Number(raw.maker_rebate_bps || 0);
  const totalFeesCollected = Number(raw.total_fees_collected || 0);

  return {
    id,
    admin: raw.admin,
    protocolTreasury: raw.protocol_treasury,
    baseFeeBps,
    baseFeePercent: bpsToPercent(baseFeeBps),
    protocolShareBps,
    protocolSharePercent: bpsToPercent(protocolShareBps),
    creatorShareBps,
    creatorSharePercent: bpsToPercent(creatorShareBps),
    referralShareBps,
    referralSharePercent: bpsToPercent(referralShareBps),
    makerRebateBps,
    makerRebatePercent: bpsToPercent(makerRebateBps),
    tiers: (raw.tiers || []).map(transformFeeTier),
    totalFeesCollected,
    totalFeesFormatted: formatBalance(totalFeesCollected),
    isPaused: raw.paused,
  };
}

function transformUserFeeStats(raw: UserFeeStatsOnChain, registry?: FeeRegistry): UserFeeStats {
  const volume30d = Number(raw.volume_30d || 0);
  const volumeLifetime = Number(raw.volume_lifetime || 0);
  const feesPaid = Number(raw.fees_paid || 0);
  const rebatesEarned = Number(raw.rebates_earned || 0);
  const referralEarnings = Number(raw.referral_earnings || 0);
  const currentTier = Number(raw.current_tier || 0);
  const lastUpdated = Number(raw.last_updated || 0);

  // Calculate effective fee from tier
  let effectiveFeeBps: number = FEE_CONSTANTS.DEFAULT_BASE_FEE_BPS;
  let nextTier: FeeTier | null = null;
  let volumeToNextTier = 0;

  if (registry && registry.tiers.length > 0) {
    // Get current tier's fee
    if (currentTier < registry.tiers.length) {
      effectiveFeeBps = registry.tiers[currentTier].feeBps;
    }

    // Find next tier
    if (currentTier < registry.tiers.length - 1) {
      nextTier = registry.tiers[currentTier + 1];
      volumeToNextTier = Math.max(0, nextTier.minVolume - volume30d);
    }
  }

  return {
    id: raw.id.id,
    user: raw.user,
    volume30d,
    volume30dFormatted: formatBalance(volume30d),
    volumeLifetime,
    volumeLifetimeFormatted: formatBalance(volumeLifetime),
    feesPaid,
    feesPaidFormatted: formatBalance(feesPaid),
    rebatesEarned,
    rebatesEarnedFormatted: formatBalance(rebatesEarned),
    referralEarnings,
    referralEarningsFormatted: formatBalance(referralEarnings),
    currentTier,
    currentTierName: TIER_NAMES[currentTier] || 'Unknown',
    lastUpdated: new Date(lastUpdated),
    effectiveFeeBps,
    effectiveFeePercent: bpsToPercent(effectiveFeeBps),
    nextTier,
    volumeToNextTier,
    volumeToNextTierFormatted: formatBalance(volumeToNextTier),
  };
}

function transformCreatorFeeConfig(raw: CreatorFeeConfigOnChain): CreatorFeeConfig {
  const earnings = Number(raw.earnings || 0);
  const totalEarned = Number(raw.total_earned || 0);
  const customFeeBps = raw.custom_fee_bps?.vec?.[0]
    ? Number(raw.custom_fee_bps.vec[0])
    : null;

  return {
    id: raw.id.id,
    creator: raw.creator,
    customFeeBps,
    customFeePercent: customFeeBps !== null ? bpsToPercent(customFeeBps) : null,
    earnings,
    earningsFormatted: formatBalance(earnings),
    totalEarned,
    totalEarnedFormatted: formatBalance(totalEarned),
    marketCount: Number(raw.market_count || 0),
  };
}

function transformReferralConfig(raw: ReferralConfigOnChain): ReferralConfig {
  const earnings = Number(raw.earnings || 0);
  const totalEarned = Number(raw.total_earned || 0);

  return {
    id: raw.id.id,
    referrer: raw.referrer,
    referralCode: raw.referral_code,
    referredCount: raw.referred_users?.length || 0,
    earnings,
    earningsFormatted: formatBalance(earnings),
    totalEarned,
    totalEarnedFormatted: formatBalance(totalEarned),
    isActive: raw.is_active,
  };
}

// =============================================================================
// FEE SERVICE CLASS
// =============================================================================

export class FeeService {
  constructor(
    private client: SuiClient,
    private signAndExecute?: (tx: Transaction) => Promise<{ digest: string; effects?: any }>
  ) {}

  // ===========================================================================
  // FEATURE 1: CREATE USER FEE STATS
  // ===========================================================================

  /**
   * Build transaction to create user fee stats
   */
  buildCreateUserStatsTx(): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::create_user_stats`,
      arguments: [tx.object(CLOCK_ID)],
    });

    return tx;
  }

  async createUserStats(): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildCreateUserStatsTx();
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to create user stats:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 2: CREATE CREATOR FEE CONFIG
  // ===========================================================================

  /**
   * Build transaction to create creator fee config
   */
  buildCreateCreatorConfigTx(): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::create_creator_config`,
      arguments: [],
    });

    return tx;
  }

  async createCreatorConfig(): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildCreateCreatorConfigTx();
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to create creator config:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 3: SET CUSTOM CREATOR FEE
  // ===========================================================================

  /**
   * Build transaction to set custom creator fee
   */
  buildSetCustomCreatorFeeTx(params: SetCustomCreatorFeeParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::set_custom_creator_fee`,
      arguments: [
        tx.object(params.creatorConfigId),
        tx.pure.u16(params.feeBps),
      ],
    });

    return tx;
  }

  async setCustomCreatorFee(params: SetCustomCreatorFeeParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildSetCustomCreatorFeeTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to set custom creator fee:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 4: CLEAR CUSTOM CREATOR FEE
  // ===========================================================================

  /**
   * Build transaction to clear custom creator fee
   */
  buildClearCustomCreatorFeeTx(creatorConfigId: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::clear_custom_creator_fee`,
      arguments: [tx.object(creatorConfigId)],
    });

    return tx;
  }

  async clearCustomCreatorFee(creatorConfigId: string): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildClearCustomCreatorFeeTx(creatorConfigId);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to clear custom creator fee:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 5: CREATE REFERRAL CODE
  // ===========================================================================

  /**
   * Build transaction to create a referral code
   */
  buildCreateReferralCodeTx(params: CreateReferralCodeParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::create_referral_code`,
      arguments: [
        tx.object(params.referralRegistryId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.code))),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async createReferralCode(params: CreateReferralCodeParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    // Validate code length
    if (params.code.length < FEE_CONSTANTS.MIN_REFERRAL_CODE_LENGTH) {
      return { success: false, error: new Error(`Referral code must be at least ${FEE_CONSTANTS.MIN_REFERRAL_CODE_LENGTH} characters`) };
    }
    if (params.code.length > FEE_CONSTANTS.MAX_REFERRAL_CODE_LENGTH) {
      return { success: false, error: new Error(`Referral code must be at most ${FEE_CONSTANTS.MAX_REFERRAL_CODE_LENGTH} characters`) };
    }

    try {
      const tx = this.buildCreateReferralCodeTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to create referral code:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 6: USE REFERRAL CODE
  // ===========================================================================

  /**
   * Build transaction to use a referral code
   */
  buildUseReferralCodeTx(params: UseReferralCodeParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::use_referral_code`,
      arguments: [
        tx.object(params.referralRegistryId),
        tx.object(params.referralConfigId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.code))),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async useReferralCode(params: UseReferralCodeParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildUseReferralCodeTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to use referral code:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 7: DEACTIVATE REFERRAL CODE
  // ===========================================================================

  /**
   * Build transaction to deactivate referral code
   */
  buildDeactivateReferralCodeTx(referralConfigId: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::deactivate_referral_code`,
      arguments: [
        tx.object(referralConfigId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async deactivateReferralCode(referralConfigId: string): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildDeactivateReferralCodeTx(referralConfigId);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to deactivate referral code:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // QUERY: GET FEE REGISTRY
  // ===========================================================================

  /**
   * Get the global fee registry
   */
  async getFeeRegistry(registryId: string): Promise<FeeRegistry | null> {
    try {
      const response = await this.client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as FeeRegistryOnChain;
      return transformFeeRegistry(registryId, fields);
    } catch (error) {
      console.error('Failed to get fee registry:', error);
      return null;
    }
  }

  /**
   * Find fee registry by querying events
   */
  async findFeeRegistry(): Promise<string | null> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::fee_events::FeeRegistryCreated`,
        },
        limit: 1,
      });

      if (events.data.length > 0) {
        const parsed = events.data[0].parsedJson as { registry_id: string };
        return parsed.registry_id;
      }

      return null;
    } catch (error) {
      console.error('Failed to find fee registry:', error);
      return null;
    }
  }

  // ===========================================================================
  // QUERY: GET USER FEE STATS
  // ===========================================================================

  /**
   * Get user fee stats by ID
   */
  async getUserFeeStats(statsId: string, registry?: FeeRegistry): Promise<UserFeeStats | null> {
    try {
      const response = await this.client.getObject({
        id: statsId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as UserFeeStatsOnChain;
      return transformUserFeeStats(fields, registry);
    } catch (error) {
      console.error('Failed to get user fee stats:', error);
      return null;
    }
  }

  /**
   * Find user's fee stats object
   */
  async findUserFeeStats(address: string): Promise<string | null> {
    try {
      const response = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::fee_types::UserFeeStats`,
        },
        options: { showContent: true },
      });

      if (response.data.length > 0 && response.data[0].data) {
        return response.data[0].data.objectId;
      }

      return null;
    } catch (error) {
      console.error('Failed to find user fee stats:', error);
      return null;
    }
  }

  /**
   * Get user's fee stats (finds and fetches)
   */
  async getUserFeeStatsForAddress(address: string, registry?: FeeRegistry): Promise<UserFeeStats | null> {
    const statsId = await this.findUserFeeStats(address);
    if (!statsId) return null;
    return this.getUserFeeStats(statsId, registry);
  }

  // ===========================================================================
  // QUERY: GET CREATOR FEE CONFIG
  // ===========================================================================

  /**
   * Get creator fee config by ID
   */
  async getCreatorFeeConfig(configId: string): Promise<CreatorFeeConfig | null> {
    try {
      const response = await this.client.getObject({
        id: configId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as CreatorFeeConfigOnChain;
      return transformCreatorFeeConfig(fields);
    } catch (error) {
      console.error('Failed to get creator fee config:', error);
      return null;
    }
  }

  /**
   * Find user's creator fee config
   */
  async findCreatorFeeConfig(address: string): Promise<string | null> {
    try {
      const response = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::fee_types::CreatorFeeConfig`,
        },
        options: { showContent: true },
      });

      if (response.data.length > 0 && response.data[0].data) {
        return response.data[0].data.objectId;
      }

      return null;
    } catch (error) {
      console.error('Failed to find creator fee config:', error);
      return null;
    }
  }

  /**
   * Get user's creator config (finds and fetches)
   */
  async getCreatorFeeConfigForAddress(address: string): Promise<CreatorFeeConfig | null> {
    const configId = await this.findCreatorFeeConfig(address);
    if (!configId) return null;
    return this.getCreatorFeeConfig(configId);
  }

  // ===========================================================================
  // QUERY: GET REFERRAL CONFIG
  // ===========================================================================

  /**
   * Get referral config by ID
   */
  async getReferralConfig(configId: string): Promise<ReferralConfig | null> {
    try {
      const response = await this.client.getObject({
        id: configId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as ReferralConfigOnChain;
      return transformReferralConfig(fields);
    } catch (error) {
      console.error('Failed to get referral config:', error);
      return null;
    }
  }

  /**
   * Find user's referral config
   */
  async findReferralConfig(address: string): Promise<string | null> {
    try {
      const response = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::fee_types::ReferralConfig`,
        },
        options: { showContent: true },
      });

      if (response.data.length > 0 && response.data[0].data) {
        return response.data[0].data.objectId;
      }

      return null;
    } catch (error) {
      console.error('Failed to find referral config:', error);
      return null;
    }
  }

  /**
   * Get user's referral config (finds and fetches)
   */
  async getReferralConfigForAddress(address: string): Promise<ReferralConfig | null> {
    const configId = await this.findReferralConfig(address);
    if (!configId) return null;
    return this.getReferralConfig(configId);
  }

  // ===========================================================================
  // QUERY: FIND REFERRAL REGISTRY
  // ===========================================================================

  /**
   * Find the referral registry shared object
   */
  async findReferralRegistry(): Promise<string | null> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::fee_events::ReferralRegistryCreated`,
        },
        limit: 1,
      });

      if (events.data.length > 0) {
        const parsed = events.data[0].parsedJson as { registry_id: string };
        return parsed.registry_id;
      }

      return null;
    } catch (error) {
      console.error('Failed to find referral registry:', error);
      return null;
    }
  }

  // ===========================================================================
  // FEATURE 8: CLAIM CREATOR EARNINGS
  // ===========================================================================

  /**
   * Build transaction to claim creator earnings
   */
  buildClaimCreatorEarningsTx(creatorConfigId: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::claim_creator_earnings`,
      arguments: [
        tx.object(creatorConfigId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async claimCreatorEarnings(creatorConfigId: string): Promise<{ success: boolean; digest?: string; amount?: number; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildClaimCreatorEarningsTx(creatorConfigId);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to claim creator earnings:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 9: CLAIM REFERRAL EARNINGS
  // ===========================================================================

  /**
   * Build transaction to claim referral earnings
   */
  buildClaimReferralEarningsTx(referralConfigId: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::fee_entries::claim_referral_earnings`,
      arguments: [
        tx.object(referralConfigId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async claimReferralEarnings(referralConfigId: string): Promise<{ success: boolean; digest?: string; amount?: number; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildClaimReferralEarningsTx(referralConfigId);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to claim referral earnings:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // EVENT QUERIES
  // ===========================================================================

  /**
   * Get referral earnings history
   */
  async getReferralEarningsHistory(referrer: string, limit: number = 50) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::fee_events::ReferralEarningsAdded`,
        },
        limit,
        order: 'descending',
      });

      return events.data
        .filter((e) => {
          const parsed = e.parsedJson as { referrer: string };
          return parsed.referrer === referrer;
        })
        .map((e) => e.parsedJson);
    } catch (error) {
      console.error('Failed to get referral earnings history:', error);
      return [];
    }
  }

  /**
   * Get creator earnings history
   */
  async getCreatorEarningsHistory(creator: string, limit: number = 50) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::fee_events::CreatorEarningsAdded`,
        },
        limit,
        order: 'descending',
      });

      return events.data
        .filter((e) => {
          const parsed = e.parsedJson as { creator: string };
          return parsed.creator === creator;
        })
        .map((e) => e.parsedJson);
    } catch (error) {
      console.error('Failed to get creator earnings history:', error);
      return [];
    }
  }

  /**
   * Get fee collection history for a user
   */
  async getFeeHistory(user: string, limit: number = 50) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::fee_events::FeeCollected`,
        },
        limit,
        order: 'descending',
      });

      return events.data
        .filter((e) => {
          const parsed = e.parsedJson as { trader: string };
          return parsed.trader === user;
        })
        .map((e) => e.parsedJson);
    } catch (error) {
      console.error('Failed to get fee history:', error);
      return [];
    }
  }
}

// =============================================================================
// ERROR HELPER
// =============================================================================

export function getFeeErrorMessage(code: number): string {
  return FEE_ERRORS[code] || `Unknown fee error (code: ${code})`;
}
