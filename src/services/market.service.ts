import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { CONTRACT_CONFIG, RESOLUTION_TYPE, MARKET_STATUS, OUTCOME } from '@/lib/config';
import {
  TransactionService,
  TransactionResult,
  SignAndExecuteFn,
  extractCreatedObjectId,
  extractEvent,
} from './transaction.service';
import type {
  Market,
  MarketOnChain,
  MarketRegistryOnChain,
  ResolutionType,
  MarketStatus,
  MarketOutcome,
  CreateMarketParams,
  MarketFilters,
  MarketSortBy,
} from '@/types/market';

const { PACKAGE_ID, MARKET_REGISTRY } = CONTRACT_CONFIG;
const CLOCK_ID = '0x6';

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface CreateMarketResult {
  marketId: string;
}

// =============================================================================
// TRANSFORMS
// =============================================================================

function parseResolutionType(type: number): ResolutionType {
  const map: Record<number, ResolutionType> = {
    [RESOLUTION_TYPE.ADMIN]: 'admin',
    [RESOLUTION_TYPE.ORACLE]: 'oracle',
  };
  return map[type] || 'admin';
}

function toResolutionTypeNumber(type: ResolutionType): number {
  const map: Record<ResolutionType, number> = {
    admin: RESOLUTION_TYPE.ADMIN,
    oracle: RESOLUTION_TYPE.ORACLE,
  };
  return map[type];
}

function parseMarketStatus(status: number): MarketStatus {
  const map: Record<number, MarketStatus> = {
    [MARKET_STATUS.OPEN]: 'open',
    [MARKET_STATUS.TRADING_ENDED]: 'trading_ended',
    [MARKET_STATUS.RESOLVED]: 'resolved',
    [MARKET_STATUS.VOIDED]: 'voided',
  };
  return map[status] || 'open';
}


function formatVolume(volumeInMist: number): string {
  const sui = volumeInMist / 1_000_000_000;
  if (sui >= 1_000_000) return `$${(sui / 1_000_000).toFixed(1)}M`;
  if (sui >= 1_000) return `$${(sui / 1_000).toFixed(1)}K`;
  if (sui >= 1) return `$${sui.toFixed(0)}`;
  return '$0';
}

function extractMarketFields(data: any): MarketOnChain | null {
  const fields = data?.content?.fields;
  if (!fields) return null;

  return {
    id: data.objectId || fields.id?.id,
    market_id: Number(fields.market_id || 0),
    question: fields.question,
    description: fields.description,
    image_url: fields.image_url || '',
    category: fields.category || '',
    tags: fields.tags || [],
    outcome_yes_label: fields.outcome_yes_label || 'Yes',
    outcome_no_label: fields.outcome_no_label || 'No',
    created_at: Number(fields.created_at || 0),
    end_time: Number(fields.end_time),
    resolution_time: Number(fields.resolution_time || 0),
    timeframe: fields.timeframe || '',
    resolution_type: Number(fields.resolution_type),
    resolution_source: fields.resolution_source || '',
    winning_outcome: Number(fields.winning_outcome ?? 255),
    resolved_at: Number(fields.resolved_at || 0),
    resolver: fields.resolver || '',
    total_volume: Number(fields.total_volume || 0),
    total_collateral: Number(fields.total_collateral || 0),
    fee_bps: Number(fields.fee_bps || 0),
    status: Number(fields.status),
    creator: fields.creator,
  };
}

function parseWinningOutcome(outcome: number): MarketOutcome {
  if (outcome === OUTCOME.YES) return 'yes';
  if (outcome === OUTCOME.NO) return 'no';
  return null; // UNSET (255) or VOID (2)
}

function transformMarket(raw: MarketOnChain): Market {
  return {
    id: raw.id,
    marketId: raw.market_id,
    title: raw.question,
    description: raw.description,
    creator: raw.creator,
    resolutionType: parseResolutionType(raw.resolution_type),
    status: parseMarketStatus(raw.status),
    outcome: parseWinningOutcome(raw.winning_outcome),
    endTime: new Date(raw.end_time),
    resolvedAt: raw.resolved_at ? new Date(raw.resolved_at) : null,
    createdAt: new Date(raw.created_at),
    volume: formatVolume(raw.total_volume),
    volumeRaw: raw.total_volume,
    category: raw.category,
    image: raw.image_url,
    outcomes: [
      { id: `${raw.id}-yes`, name: raw.outcome_yes_label || 'Yes', price: 50 },
      { id: `${raw.id}-no`, name: raw.outcome_no_label || 'No', price: 50 },
    ],
  };
}

// =============================================================================
// MARKET SERVICE
// =============================================================================

export class MarketService {
  private txService: TransactionService | null = null;

  constructor(private client: SuiClient) {}

  /**
   * Initialize with transaction capabilities (call when wallet connected)
   */
  withSigner(signAndExecute: SignAndExecuteFn): this {
    this.txService = new TransactionService(this.client, signAndExecute);
    return this;
  }

  // ===========================================================================
  // READS
  // ===========================================================================

  /**
   * Get the market registry
   */
  async getRegistry(): Promise<MarketRegistryOnChain | null> {
    try {
      const response = await this.client.getObject({
        id: MARKET_REGISTRY,
        options: { showContent: true },
      });

      const content = response.data?.content;
      if (!content || content.dataType !== 'moveObject') return null;

      const fields = content.fields as any;
      if (!fields) return null;

      return {
        id: MARKET_REGISTRY,
        market_count: Number(fields.market_count || 0),
        total_volume: Number(fields.total_volume || 0),
        total_collateral: Number(fields.total_collateral || 0),
        creation_fee: Number(fields.creation_fee || 0),
        treasury: fields.treasury || '',
        paused: Boolean(fields.paused),
      };
    } catch (error) {
      console.error('Failed to fetch registry:', error);
      return null;
    }
  }

  /**
   * Get a single market by object ID
   */
  async getMarket(marketId: string): Promise<Market | null> {
    try {
      const response = await this.client.getObject({
        id: marketId,
        options: { showContent: true },
      });

      const raw = extractMarketFields(response.data);
      if (!raw) return null;

      return transformMarket(raw);
    } catch (error) {
      console.error('Failed to fetch market:', error);
      return null;
    }
  }

  /**
   * Get a market by its numeric market_id (u64)
   * This is useful when you have tokens that store the numeric market_id
   */
  async getMarketByNumericId(numericMarketId: string | number): Promise<Market | null> {
    try {
      const targetId = Number(numericMarketId);
      const marketIds = await this.getMarketObjects();

      if (marketIds.length === 0) return null;

      // Batch fetch objects in chunks of 50 (Sui API limit)
      const BATCH_SIZE = 50;
      for (let i = 0; i < marketIds.length; i += BATCH_SIZE) {
        const batch = marketIds.slice(i, i + BATCH_SIZE);
        const responses = await this.client.multiGetObjects({
          ids: batch,
          options: { showContent: true },
        });

        for (let j = 0; j < responses.length; j++) {
          const raw = extractMarketFields(responses[j].data);
          if (raw && raw.market_id === targetId) {
            raw.id = batch[j];
            return transformMarket(raw);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch market by numeric id:', error);
      return null;
    }
  }

  /**
   * Build a map from numeric market_id to Market objects
   * Useful for resolving multiple positions at once
   */
  async getMarketsByNumericIds(numericIds: (string | number)[]): Promise<Map<string, Market>> {
    const result = new Map<string, Market>();

    try {
      const targetIds = new Set(numericIds.map(id => String(id)));
      const marketObjectIds = await this.getMarketObjects();

      if (marketObjectIds.length === 0) return result;

      // Batch fetch objects in chunks of 50 (Sui API limit)
      const BATCH_SIZE = 50;
      for (let i = 0; i < marketObjectIds.length; i += BATCH_SIZE) {
        const batch = marketObjectIds.slice(i, i + BATCH_SIZE);
        const responses = await this.client.multiGetObjects({
          ids: batch,
          options: { showContent: true },
        });

        for (let j = 0; j < responses.length; j++) {
          const raw = extractMarketFields(responses[j].data);
          if (raw && targetIds.has(String(raw.market_id))) {
            raw.id = batch[j];
            result.set(String(raw.market_id), transformMarket(raw));
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to fetch markets by numeric ids:', error);
      return result;
    }
  }

  /**
   * Get all markets by querying shared Market objects
   */
  async getMarketObjects(): Promise<string[]> {
    try {
      const marketType = `${PACKAGE_ID}::market_types::Market`;
      const allTxDigests: string[] = [];
      let cursor: { txDigest: string; eventSeq: string } | null | undefined = undefined;
      let hasNextPage = true;

      // Paginate through all MarketCreated events
      while (hasNextPage) {
        const result = await this.client.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::market_events::MarketCreated`,
          },
          limit: 50,
          order: 'descending',
          cursor: cursor,
        });

        allTxDigests.push(...result.data.map(e => e.id.txDigest));
        hasNextPage = result.hasNextPage;
        cursor = result.nextCursor ?? null;
      }

      // Get unique transaction digests
      const uniqueTxDigests = [...new Set(allTxDigests)];

      if (uniqueTxDigests.length === 0) return [];

      // Get transaction blocks to find created market objects
      const marketIds: string[] = [];
      for (const digest of uniqueTxDigests) {
        try {
          const txBlock = await this.client.getTransactionBlock({
            digest,
            options: { showObjectChanges: true },
          });

          const changes = txBlock.objectChanges || [];
          for (const change of changes) {
            if (
              change.type === 'created' &&
              change.objectType === marketType
            ) {
              marketIds.push(change.objectId);
            }
          }
        } catch (err) {
          console.warn('Failed to get tx block:', digest, err);
        }
      }

      return marketIds;
    } catch (error) {
      console.error('Failed to fetch market objects:', error);
      return [];
    }
  }

  /**
   * Get all markets
   */
  async getMarkets(options?: {
    filters?: MarketFilters;
    sortBy?: MarketSortBy;
    limit?: number;
  }): Promise<Market[]> {
    try {
      const marketIds = await this.getMarketObjects();
      if (marketIds.length === 0) return [];

      // Batch fetch objects in chunks of 50 (Sui API limit)
      const BATCH_SIZE = 50;
      const responses: any[] = [];

      for (let i = 0; i < marketIds.length; i += BATCH_SIZE) {
        const batch = marketIds.slice(i, i + BATCH_SIZE);
        const batchResponses = await this.client.multiGetObjects({
          ids: batch,
          options: { showContent: true },
        });
        responses.push(...batchResponses);
      }

      let markets: Market[] = [];

      for (let i = 0; i < responses.length; i++) {
        const raw = extractMarketFields(responses[i].data);
        if (raw) {
          raw.id = marketIds[i];
          markets.push(transformMarket(raw));
        }
      }

      // Apply filters
      if (options?.filters) {
        markets = this.applyFilters(markets, options.filters);
      }

      // Apply sorting
      if (options?.sortBy) {
        markets = this.applySorting(markets, options.sortBy);
      }

      // Apply limit
      if (options?.limit) {
        markets = markets.slice(0, options.limit);
      }

      return markets;
    } catch (error) {
      console.error('Failed to fetch markets:', error);
      return [];
    }
  }

  /**
   * Get markets by creator
   */
  async getMarketsByCreator(creator: string): Promise<Market[]> {
    return this.getMarkets({ filters: { creator } });
  }

  /**
   * Get open markets
   */
  async getOpenMarkets(): Promise<Market[]> {
    return this.getMarkets({ filters: { status: 'open' }, sortBy: 'volume' });
  }

  // ===========================================================================
  // WRITES
  // ===========================================================================

  /**
   * Create a new market
   */
  async createMarket(params: CreateMarketParams): Promise<TransactionResult<CreateMarketResult>> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();
    const creationFee = 10_000_000; // 0.01 SUI

    const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(creationFee)]);

    // Prepare tags as vector<vector<u8>>
    const tags = params.tags || [];
    const serializedTags = tx.pure.vector('vector<u8>', tags.map(tag => Array.from(new TextEncoder().encode(tag))));

    // Default values
    const imageUrl = params.imageUrl || '';
    const category = params.category || 'General';
    const outcomeYesLabel = params.outcomeYesLabel || 'Yes';
    const outcomeNoLabel = params.outcomeNoLabel || 'No';
    const endTimeMs = params.endTime.getTime();
    const resolutionTimeMs = params.resolutionTime?.getTime() || endTimeMs + 86400000; // Default: end_time + 24 hours
    const timeframe = params.timeframe || '';
    const resolutionSource = params.resolutionSource || '';
    const feeBps = params.feeBps || 100; // 1% default

    tx.moveCall({
      target: `${PACKAGE_ID}::market_entries::create_market`,
      arguments: [
        tx.object(MARKET_REGISTRY),
        feeCoin,
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.question))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(params.description))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(imageUrl))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(category))),
        serializedTags,
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(outcomeYesLabel))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(outcomeNoLabel))),
        tx.pure.u64(endTimeMs),
        tx.pure.u64(resolutionTimeMs),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(timeframe))),
        tx.pure.u8(toResolutionTypeNumber(params.resolutionType)),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(resolutionSource))),
        tx.pure.u16(feeBps),
        tx.object(CLOCK_ID),
      ],
    });

    return this.txService.execute(tx, (response) => {
      const marketId =
        extractCreatedObjectId(response, 'Market') ||
        extractEvent<{ market_id: string }>(response, 'MarketCreated')?.market_id;

      return { marketId: marketId || '' };
    });
  }

  /**
   * Void a market by creator
   * Creator can void their own market (status changes to VOIDED)
   */
  async voidByCreator(marketId: string, reason: string = 'Voided by creator'): Promise<TransactionResult> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::market_entries::void_by_creator`,
      arguments: [
        tx.object(marketId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(reason))),
        tx.object(CLOCK_ID),
      ],
    });

    return this.txService.execute(tx);
  }

  /**
   * End trading on a market
   * Anyone can call this to transition the market when end_time has passed
   */
  async endTrading(marketId: string): Promise<TransactionResult> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::market_entries::end_trading`,
      arguments: [
        tx.object(marketId),
        tx.object(CLOCK_ID),
      ],
    });

    return this.txService.execute(tx);
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private applyFilters(markets: Market[], filters: MarketFilters): Market[] {
    let result = markets;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      result = result.filter((m) => m.status && statuses.includes(m.status));
    }

    if (filters.creator) {
      result = result.filter((m) => m.creator === filters.creator);
    }

    if (filters.resolutionType) {
      result = result.filter((m) => m.resolutionType === filters.resolutionType);
    }

    if (filters.category) {
      const categoryLower = filters.category.toLowerCase();
      result = result.filter((m) => m.category?.toLowerCase() === categoryLower);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(search) ||
          (m.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return result;
  }

  private applySorting(markets: Market[], sortBy: MarketSortBy): Market[] {
    const sorted = [...markets];

    switch (sortBy) {
      case 'newest':
        return sorted.sort(
          (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        );
      case 'ending_soon':
        return sorted.sort(
          (a, b) => (a.endTime?.getTime() ?? Infinity) - (b.endTime?.getTime() ?? Infinity)
        );
      case 'volume':
      case 'trending':
        return sorted.sort((a, b) => (b.volumeRaw ?? 0) - (a.volumeRaw ?? 0));
      default:
        return sorted;
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a MarketService instance
 */
export function createMarketService(client: SuiClient): MarketService {
  return new MarketService(client);
}
