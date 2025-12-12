// =============================================================================
// ORACLE SERVICE
// =============================================================================
// Handles all oracle-related operations: Resolution requests, proposals, disputes

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG } from '@/lib/config';
import {
  type OracleRegistry,
  type OracleProvider,
  type ResolutionRequest,
  type OracleRegistryOnChain,
  type OracleProviderOnChain,
  type ResolutionRequestOnChain,
  type RequestResolutionParams,
  type ProposeOutcomeParams,
  type DisputeOutcomeParams,
  type FinalizeUndisputedParams,
  ORACLE_CONSTANTS,
  REQUEST_STATUS_NAMES,
  PROVIDER_TYPE_NAMES,
  OUTCOME_NAMES,
  ORACLE_ERRORS,
} from '@/types/oracle';

const { PACKAGE_ID } = CONTRACT_CONFIG;
const CLOCK_ID = '0x6';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatBalance(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (sui >= 1_000_000) return `${(sui / 1_000_000).toFixed(2)}M SUI`;
  if (sui >= 1_000) return `${(sui / 1_000).toFixed(2)}K SUI`;
  if (sui >= 1) return `${sui.toFixed(4)} SUI`;
  return `${sui.toFixed(6)} SUI`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function transformOracleRegistry(id: string, raw: OracleRegistryOnChain): OracleRegistry {
  const defaultBond = Number(raw.default_bond || 0);
  const defaultDisputeWindow = Number(raw.default_dispute_window || 0);

  return {
    id,
    admin: raw.admin,
    defaultBond,
    defaultBondFormatted: formatBalance(defaultBond),
    defaultDisputeWindow,
    defaultDisputeWindowFormatted: formatDuration(defaultDisputeWindow),
    totalRequests: Number(raw.total_requests || 0),
  };
}

function transformOracleProvider(raw: OracleProviderOnChain): OracleProvider {
  const minBond = Number(raw.min_bond || 0);
  const disputeWindow = Number(raw.dispute_window || 0);
  const providerType = Number(raw.provider_type || 0);

  return {
    name: raw.name,
    providerType,
    providerTypeName: PROVIDER_TYPE_NAMES[providerType] || 'Unknown',
    isActive: raw.is_active,
    minBond,
    minBondFormatted: formatBalance(minBond),
    disputeWindow,
    disputeWindowFormatted: formatDuration(disputeWindow),
    totalResolutions: Number(raw.total_resolutions || 0),
  };
}

function transformResolutionRequest(raw: ResolutionRequestOnChain, currentTime: number): ResolutionRequest {
  const status = Number(raw.status || 0);
  const proposedOutcome = Number(raw.proposed_outcome || 255);
  const finalOutcome = Number(raw.final_outcome || 255);
  const requesterBond = Number(raw.requester_bond?.value || 0);
  const proposerBond = Number(raw.proposer_bond?.value || 0);
  const disputerBond = Number(raw.disputer_bond?.value || 0);
  const requestTime = Number(raw.request_time || 0);
  const proposalTime = Number(raw.proposal_time || 0);
  const disputeDeadline = Number(raw.dispute_deadline || 0);
  const resolvedTime = Number(raw.resolved_time || 0);

  const isPending = status === ORACLE_CONSTANTS.STATUS_PENDING;
  const isProposed = status === ORACLE_CONSTANTS.STATUS_PROPOSED;
  const isDisputed = status === ORACLE_CONSTANTS.STATUS_DISPUTED;
  const isFinalized = status === ORACLE_CONSTANTS.STATUS_FINALIZED;
  const isCancelled = status === ORACLE_CONSTANTS.STATUS_CANCELLED;

  // Calculate if actions are available
  const canPropose = isPending;
  const canDispute = isProposed && currentTime < disputeDeadline;
  const canFinalize = isProposed && currentTime >= disputeDeadline;

  const timeUntilDisputeDeadline = isProposed && disputeDeadline > currentTime
    ? disputeDeadline - currentTime
    : null;

  return {
    id: raw.id.id,
    requestId: Number(raw.request_id || 0),
    marketId: Number(raw.market_id || 0),
    oracleSource: raw.oracle_source || '',
    requester: raw.requester,
    requesterBond,
    requesterBondFormatted: formatBalance(requesterBond),
    requestTime: new Date(requestTime),
    status,
    statusName: REQUEST_STATUS_NAMES[status] || 'Unknown',
    proposedOutcome,
    proposedOutcomeName: OUTCOME_NAMES[proposedOutcome] || 'Unset',
    proposer: raw.proposer,
    proposerBond,
    proposerBondFormatted: formatBalance(proposerBond),
    proposalTime: proposalTime > 0 ? new Date(proposalTime) : null,
    disputeDeadline: disputeDeadline > 0 ? new Date(disputeDeadline) : null,
    disputer: raw.disputer,
    disputerBond,
    disputerBondFormatted: formatBalance(disputerBond),
    finalOutcome,
    finalOutcomeName: OUTCOME_NAMES[finalOutcome] || 'Unset',
    resolvedTime: resolvedTime > 0 ? new Date(resolvedTime) : null,
    // Computed fields
    isPending,
    isProposed,
    isDisputed,
    isFinalized,
    isCancelled,
    canPropose,
    canDispute,
    canFinalize,
    timeUntilDisputeDeadline,
  };
}

// =============================================================================
// ORACLE SERVICE CLASS
// =============================================================================

export class OracleService {
  constructor(
    private client: SuiClient,
    private signAndExecute?: (tx: Transaction) => Promise<{ digest: string; effects?: any }>
  ) {}

  // ===========================================================================
  // FEATURE 1: REQUEST RESOLUTION
  // ===========================================================================

  /**
   * Build transaction to request oracle resolution
   */
  buildRequestResolutionTx(params: RequestResolutionParams): Transaction {
    const tx = new Transaction();

    // Split coin for bond
    const [bondCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.bondAmount)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::oracle_entries::request_resolution`,
      arguments: [
        tx.object(params.oracleRegistryId),
        tx.object(params.marketId),
        bondCoin,
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async requestResolution(params: RequestResolutionParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildRequestResolutionTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to request resolution:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 2: PROPOSE OUTCOME
  // ===========================================================================

  /**
   * Build transaction to propose outcome
   */
  buildProposeOutcomeTx(params: ProposeOutcomeParams): Transaction {
    const tx = new Transaction();

    // Split coin for bond
    const [bondCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.bondAmount)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::oracle_entries::propose_outcome`,
      arguments: [
        tx.object(params.oracleRegistryId),
        tx.object(params.requestId),
        tx.pure.u8(params.proposedOutcome),
        bondCoin,
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async proposeOutcome(params: ProposeOutcomeParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildProposeOutcomeTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to propose outcome:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 3: DISPUTE OUTCOME
  // ===========================================================================

  /**
   * Build transaction to dispute outcome
   */
  buildDisputeOutcomeTx(params: DisputeOutcomeParams): Transaction {
    const tx = new Transaction();

    // Split coin for bond
    const [bondCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.bondAmount)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::oracle_entries::dispute_outcome`,
      arguments: [
        tx.object(params.oracleRegistryId),
        tx.object(params.requestId),
        bondCoin,
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async disputeOutcome(params: DisputeOutcomeParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildDisputeOutcomeTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to dispute outcome:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 4: FINALIZE UNDISPUTED
  // ===========================================================================

  /**
   * Build transaction to finalize undisputed resolution
   */
  buildFinalizeUndisputedTx(params: FinalizeUndisputedParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::oracle_entries::finalize_undisputed`,
      arguments: [
        tx.object(params.oracleRegistryId),
        tx.object(params.requestId),
        tx.object(params.marketId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async finalizeUndisputed(params: FinalizeUndisputedParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildFinalizeUndisputedTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to finalize resolution:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // QUERY: GET ORACLE REGISTRY
  // ===========================================================================

  /**
   * Get the oracle registry
   */
  async getOracleRegistry(registryId: string): Promise<OracleRegistry | null> {
    try {
      const response = await this.client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as OracleRegistryOnChain;
      return transformOracleRegistry(registryId, fields);
    } catch (error) {
      console.error('Failed to get oracle registry:', error);
      return null;
    }
  }

  /**
   * Find oracle registry by querying events
   */
  async findOracleRegistry(): Promise<string | null> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::oracle_events::OracleRegistryInitialized`,
        },
        limit: 1,
      });

      if (events.data.length > 0) {
        const parsed = events.data[0].parsedJson as { registry_id: string };
        return parsed.registry_id;
      }

      return null;
    } catch (error) {
      console.error('Failed to find oracle registry:', error);
      return null;
    }
  }

  // ===========================================================================
  // QUERY: GET RESOLUTION REQUEST
  // ===========================================================================

  /**
   * Get resolution request by ID
   */
  async getResolutionRequest(requestId: string): Promise<ResolutionRequest | null> {
    try {
      const response = await this.client.getObject({
        id: requestId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as ResolutionRequestOnChain;
      return transformResolutionRequest(fields, Date.now());
    } catch (error) {
      console.error('Failed to get resolution request:', error);
      return null;
    }
  }

  /**
   * Find resolution request for a market
   */
  async findRequestForMarket(marketId: number): Promise<string | null> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::oracle_events::ResolutionRequested`,
        },
        limit: 50,
        order: 'descending',
      });

      for (const event of events.data) {
        const parsed = event.parsedJson as { market_id: string; request_id: string };
        if (Number(parsed.market_id) === marketId) {
          return parsed.request_id;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find request for market:', error);
      return null;
    }
  }

  /**
   * Get all resolution requests (for a list of markets or all)
   */
  async getResolutionRequests(limit: number = 50): Promise<ResolutionRequest[]> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::oracle_events::ResolutionRequested`,
        },
        limit,
        order: 'descending',
      });

      const requests: ResolutionRequest[] = [];
      const currentTime = Date.now();

      for (const event of events.data) {
        const parsed = event.parsedJson as { request_id: string };
        // Note: In a real implementation, you'd batch fetch these
        // For now, we extract what we can from events
      }

      return requests;
    } catch (error) {
      console.error('Failed to get resolution requests:', error);
      return [];
    }
  }

  // ===========================================================================
  // EVENT QUERIES
  // ===========================================================================

  /**
   * Get resolution request events for a market
   */
  async getMarketOracleHistory(marketId: number, limit: number = 20) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::oracle_events::ResolutionRequested`,
        },
        limit: limit * 3, // Fetch more to filter
        order: 'descending',
      });

      return events.data
        .filter((e) => {
          const parsed = e.parsedJson as { market_id: string };
          return Number(parsed.market_id) === marketId;
        })
        .map((e) => e.parsedJson);
    } catch (error) {
      console.error('Failed to get market oracle history:', error);
      return [];
    }
  }

  /**
   * Get user's oracle participation history
   */
  async getUserOracleHistory(address: string, limit: number = 50) {
    try {
      // Get requests, proposals, and disputes by this user
      const [requested, proposed, disputed] = await Promise.all([
        this.client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::oracle_events::ResolutionRequested` },
          limit,
          order: 'descending',
        }),
        this.client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::oracle_events::OutcomeProposed` },
          limit,
          order: 'descending',
        }),
        this.client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::oracle_events::OutcomeDisputed` },
          limit,
          order: 'descending',
        }),
      ]);

      const history = [
        ...requested.data.filter((e) => (e.parsedJson as any).requester === address)
          .map((e) => ({ type: 'requested' as const, ...(e.parsedJson as object) })),
        ...proposed.data.filter((e) => (e.parsedJson as any).proposer === address)
          .map((e) => ({ type: 'proposed' as const, ...(e.parsedJson as object) })),
        ...disputed.data.filter((e) => (e.parsedJson as any).disputer === address)
          .map((e) => ({ type: 'disputed' as const, ...(e.parsedJson as object) })),
      ];

      // Sort by timestamp descending
      return history.sort((a, b) => (b as any).timestamp - (a as any).timestamp);
    } catch (error) {
      console.error('Failed to get user oracle history:', error);
      return [];
    }
  }
}

// =============================================================================
// ERROR HELPER
// =============================================================================

export function getOracleErrorMessage(code: number): string {
  return ORACLE_ERRORS[code] || `Unknown oracle error (code: ${code})`;
}
