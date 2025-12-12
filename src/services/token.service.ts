import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { CONTRACT_CONFIG } from '@/lib/config';
import {
  TransactionService,
  TransactionResult,
  SignAndExecuteFn,
} from './transaction.service';
import type {
  YesToken,
  NoToken,
  TokenVault,
  MarketPosition,
  Portfolio,
  YesTokenOnChain,
  NoTokenOnChain,
  TokenVaultOnChain,
  MintTokensParams,
  MergeTokenSetParams,
  RedeemTokensParams,
  RedeemVoidedParams,
  SplitTokenParams,
  MergeTokensParams,
  MintTokensResult,
  RedeemTokensResult,
} from '@/types/token';

const { PACKAGE_ID, MARKET_REGISTRY } = CONTRACT_CONFIG;
const CLOCK_ID = '0x6';

// =============================================================================
// TRANSFORMS
// =============================================================================

function formatBalance(balanceInMist: number): string {
  const sui = balanceInMist / 1_000_000_000;
  if (sui >= 1_000_000) return `${(sui / 1_000_000).toFixed(2)}M`;
  if (sui >= 1_000) return `${(sui / 1_000).toFixed(2)}K`;
  if (sui >= 1) return sui.toFixed(2);
  if (sui >= 0.01) return sui.toFixed(4);
  return sui.toFixed(6);
}

function transformYesToken(raw: YesTokenOnChain): YesToken {
  return {
    id: raw.id,
    marketId: raw.market_id,
    balance: raw.balance,
    balanceFormatted: `${formatBalance(raw.balance)} YES`,
  };
}

function transformNoToken(raw: NoTokenOnChain): NoToken {
  return {
    id: raw.id,
    marketId: raw.market_id,
    balance: raw.balance,
    balanceFormatted: `${formatBalance(raw.balance)} NO`,
  };
}

function transformVault(raw: TokenVaultOnChain): TokenVault {
  return {
    id: raw.id,
    marketId: raw.market_id,
    suiBalance: raw.sui_balance,
    suiBalanceFormatted: `${formatBalance(raw.sui_balance)} SUI`,
    yesSupply: raw.yes_supply,
    noSupply: raw.no_supply,
  };
}

// =============================================================================
// TOKEN SERVICE
// =============================================================================

export class TokenService {
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
  // READS - Token Queries
  // ===========================================================================

  /**
   * Get all YES tokens owned by an address
   */
  async getYesTokens(owner: string): Promise<YesToken[]> {
    try {
      const response = await this.client.getOwnedObjects({
        owner,
        filter: {
          StructType: `${PACKAGE_ID}::token_types::YesToken`,
        },
        options: { showContent: true },
      });

      console.log('getYesTokens response:', response.data.length, 'objects');
      return response.data
        .map((obj) => {
          const fields = (obj.data?.content as any)?.fields;
          if (!fields) return null;
          console.log('YesToken fields:', fields);
          return transformYesToken({
            id: obj.data?.objectId || '',
            market_id: fields.market_id,
            // Smart contract uses 'amount' field
            balance: Number(fields.amount || fields.balance || fields.value || 0),
          });
        })
        .filter((t): t is YesToken => t !== null);
    } catch (error) {
      console.error('Failed to fetch YES tokens:', error);
      return [];
    }
  }

  /**
   * Get all NO tokens owned by an address
   */
  async getNoTokens(owner: string): Promise<NoToken[]> {
    try {
      const response = await this.client.getOwnedObjects({
        owner,
        filter: {
          StructType: `${PACKAGE_ID}::token_types::NoToken`,
        },
        options: { showContent: true },
      });

      console.log('getNoTokens response:', response.data.length, 'objects');
      return response.data
        .map((obj) => {
          const fields = (obj.data?.content as any)?.fields;
          if (!fields) return null;
          console.log('NoToken fields:', fields);
          return transformNoToken({
            id: obj.data?.objectId || '',
            market_id: fields.market_id,
            // Smart contract uses 'amount' field
            balance: Number(fields.amount || fields.balance || fields.value || 0),
          });
        })
        .filter((t): t is NoToken => t !== null);
    } catch (error) {
      console.error('Failed to fetch NO tokens:', error);
      return [];
    }
  }

  /**
   * Get tokens for a specific market
   * @param owner - Wallet address
   * @param marketObjectId - The Sui object ID of the market (e.g., "0xab13...")
   */
  async getTokensForMarket(
    owner: string,
    marketObjectId: string
  ): Promise<{ yesTokens: YesToken[]; noTokens: NoToken[] }> {
    // First, get the numeric market_id from the market object
    const marketResponse = await this.client.getObject({
      id: marketObjectId,
      options: { showContent: true },
    });

    const fields = (marketResponse.data?.content as any)?.fields;
    const numericMarketId = fields?.market_id !== undefined ? String(fields.market_id) : null;

    console.log('getTokensForMarket - marketObjectId:', marketObjectId, 'numericMarketId:', numericMarketId);

    if (numericMarketId === null) {
      console.error('Could not get numeric market_id from market');
      return { yesTokens: [], noTokens: [] };
    }

    const [allYes, allNo] = await Promise.all([
      this.getYesTokens(owner),
      this.getNoTokens(owner),
    ]);

    console.log('All YES tokens:', allYes.map(t => ({ id: t.id, marketId: t.marketId })));
    console.log('All NO tokens:', allNo.map(t => ({ id: t.id, marketId: t.marketId })));

    // Filter by numeric market_id (tokens store market_id as u64)
    return {
      yesTokens: allYes.filter((t) => String(t.marketId) === numericMarketId),
      noTokens: allNo.filter((t) => String(t.marketId) === numericMarketId),
    };
  }

  /**
   * Get user's position in a market
   */
  async getMarketPosition(owner: string, marketId: string): Promise<MarketPosition> {
    const { yesTokens, noTokens } = await this.getTokensForMarket(owner, marketId);

    const totalYesBalance = yesTokens.reduce((sum, t) => sum + t.balance, 0);
    const totalNoBalance = noTokens.reduce((sum, t) => sum + t.balance, 0);

    return {
      marketId,
      yesTokens,
      noTokens,
      totalYesBalance,
      totalNoBalance,
      totalYesBalanceFormatted: `${formatBalance(totalYesBalance)} YES`,
      totalNoBalanceFormatted: `${formatBalance(totalNoBalance)} NO`,
    };
  }

  /**
   * Get user's full portfolio across all markets
   */
  async getPortfolio(owner: string): Promise<Portfolio> {
    const [yesTokens, noTokens] = await Promise.all([
      this.getYesTokens(owner),
      this.getNoTokens(owner),
    ]);

    // Group by market
    const marketIds = new Set([
      ...yesTokens.map((t) => t.marketId),
      ...noTokens.map((t) => t.marketId),
    ]);

    const positions: MarketPosition[] = [];
    let totalValue = 0;

    for (const marketId of marketIds) {
      const marketYes = yesTokens.filter((t) => t.marketId === marketId);
      const marketNo = noTokens.filter((t) => t.marketId === marketId);

      const totalYesBalance = marketYes.reduce((sum, t) => sum + t.balance, 0);
      const totalNoBalance = marketNo.reduce((sum, t) => sum + t.balance, 0);

      // Estimate value: min of YES and NO can always be merged back to SUI
      const mergeableValue = Math.min(totalYesBalance, totalNoBalance);
      totalValue += mergeableValue;

      positions.push({
        marketId,
        yesTokens: marketYes,
        noTokens: marketNo,
        totalYesBalance,
        totalNoBalance,
        totalYesBalanceFormatted: `${formatBalance(totalYesBalance)} YES`,
        totalNoBalanceFormatted: `${formatBalance(totalNoBalance)} NO`,
        estimatedValue: mergeableValue,
        estimatedValueFormatted: `${formatBalance(mergeableValue)} SUI`,
      });
    }

    return {
      positions,
      totalPositions: positions.length,
      totalValue,
      totalValueFormatted: `${formatBalance(totalValue)} SUI`,
    };
  }

  /**
   * Get token vault for a market
   */
  async getVault(vaultId: string): Promise<TokenVault | null> {
    try {
      const response = await this.client.getObject({
        id: vaultId,
        options: { showContent: true },
      });

      const fields = (response.data?.content as any)?.fields;
      if (!fields) return null;

      return transformVault({
        id: vaultId,
        market_id: fields.market_id,
        sui_balance: Number(fields.sui_balance || 0),
        yes_supply: Number(fields.yes_supply || 0),
        no_supply: Number(fields.no_supply || 0),
      });
    } catch (error) {
      console.error('Failed to fetch vault:', error);
      return null;
    }
  }

  /**
   * Find vault for a market by querying events or objects
   * @param marketObjectId - The Sui object ID of the market (e.g., "0xab13...")
   */
  async findVaultForMarket(marketObjectId: string): Promise<string | null> {
    try {
      // First, get the numeric market_id from the market object
      const marketResponse = await this.client.getObject({
        id: marketObjectId,
        options: { showContent: true },
      });

      const fields = (marketResponse.data?.content as any)?.fields;
      const numericMarketId = fields?.market_id !== undefined ? Number(fields.market_id) : null;

      console.log('Finding vault for market:', marketObjectId, 'numeric id:', numericMarketId);

      if (numericMarketId === null) {
        console.error('Could not get numeric market_id');
        return null;
      }

      // Query VaultCreated events to get transaction digests
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::token_events::VaultCreated`,
        },
        limit: 100,
        order: 'descending',
      });

      console.log('Found VaultCreated events:', events.data.length);

      // Find events that match our market_id and get vault from transaction
      for (const event of events.data) {
        const parsed = event.parsedJson as any;

        // Compare with numeric market_id
        if (Number(parsed.market_id) === numericMarketId) {
          console.log('Found matching event for market_id:', numericMarketId);

          // Get vault ID from the transaction that created it
          const txBlock = await this.client.getTransactionBlock({
            digest: event.id.txDigest,
            options: { showObjectChanges: true },
          });

          const vaultCreated = txBlock.objectChanges?.find(
            (c: any) => c.type === 'created' && c.objectType?.includes('TokenVault')
          );

          if (vaultCreated && 'objectId' in vaultCreated) {
            console.log('Found vault from tx:', vaultCreated.objectId);
            return vaultCreated.objectId;
          }
        }
      }

      console.log('No vault found for market');
      return null;
    } catch (error) {
      console.error('Failed to find vault:', error);
      return null;
    }
  }

  // ===========================================================================
  // WRITES - Token Operations
  // ===========================================================================

  /**
   * Create a token vault for a market
   * @param marketObjectId - The Sui object ID of the market (e.g., "0xab13...")
   */
  async createVault(marketObjectId: string): Promise<TransactionResult<{ vaultId: string }>> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    try {
      // First, fetch the market to get its numeric market_id
      const marketResponse = await this.client.getObject({
        id: marketObjectId,
        options: { showContent: true },
      });

      const fields = (marketResponse.data?.content as any)?.fields;
      if (!fields?.market_id) {
        console.error('Market fields:', fields);
        return { success: false, error: { code: 'MARKET_NOT_FOUND', message: 'Could not find market or market_id' } };
      }

      const numericMarketId = Number(fields.market_id);
      console.log('Creating vault for market_id:', numericMarketId);

      const tx = new Transaction();

      // Pass the numeric market_id (u64)
      tx.moveCall({
        target: `${PACKAGE_ID}::token_entries::create_vault`,
        arguments: [
          tx.pure.u64(numericMarketId),
          tx.object(CLOCK_ID),
        ],
      });

      const result = await this.txService.execute(tx, (response) => {
        console.log('Create vault response:', response);
        // Extract vault ID from created objects
        const created = response.objectChanges?.find(
          (c: any) => c.type === 'created' && c.objectType?.includes('TokenVault')
        );
        const vaultId = (created as any)?.objectId || '';
        console.log('Extracted vault ID:', vaultId);
        return { vaultId };
      });

      console.log('Create vault result:', result);

      // If vault ID is empty, we need to fetch it from the transaction
      if (result.success && (!result.data?.vaultId || result.data.vaultId === '')) {
        console.log('Vault ID not in response, fetching from transaction...');
        // Wait a bit and try to find the vault
        const txDetails = await this.client.getTransactionBlock({
          digest: result.digest!,
          options: { showObjectChanges: true },
        });

        console.log('Transaction details:', txDetails);
        const createdVault = txDetails.objectChanges?.find(
          (c: any) => c.type === 'created' && c.objectType?.includes('TokenVault')
        );

        if (createdVault && 'objectId' in createdVault) {
          console.log('Found vault ID from tx:', createdVault.objectId);
          return {
            ...result,
            data: { vaultId: createdVault.objectId },
          };
        }
      }

      return result;
    } catch (error) {
      console.error('Create vault error:', error);
      return {
        success: false,
        error: {
          code: 'CREATE_VAULT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error creating vault'
        }
      };
    }
  }

  /**
   * Mint YES + NO tokens by depositing SUI
   * 1 SUI = 1 YES + 1 NO
   */
  async mintTokens(params: MintTokensParams): Promise<TransactionResult<MintTokensResult>> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    console.log('mintTokens called with params:', params);

    try {
      const tx = new Transaction();

      // Split deposit amount from gas
      const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.amount)]);

      console.log('Building mint transaction...');
      tx.moveCall({
        target: `${PACKAGE_ID}::token_entries::mint_tokens`,
        arguments: [
          tx.object(params.marketId),
          tx.object(MARKET_REGISTRY),
          tx.object(params.vaultId),
          depositCoin,
          tx.object(CLOCK_ID),
        ],
      });

      console.log('Executing mint transaction...');
      const result = await this.txService.execute(tx, (response) => {
        console.log('Mint response:', response);
        const created = response.objectChanges?.filter((c: any) => c.type === 'created') || [];
        const yesToken = created.find((c: any) => c.objectType?.includes('YesToken'));
        const noToken = created.find((c: any) => c.objectType?.includes('NoToken'));

        return {
          yesTokenId: (yesToken as any)?.objectId || '',
          noTokenId: (noToken as any)?.objectId || '',
          amount: params.amount,
        };
      });

      console.log('Mint result:', result);
      return result;
    } catch (error) {
      console.error('Mint error:', error);
      return {
        success: false,
        error: {
          code: 'MINT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error minting tokens',
        },
      };
    }
  }

  /**
   * Merge YES + NO tokens back to SUI
   * Can be done anytime while market is open
   */
  async mergeTokenSet(params: MergeTokenSetParams): Promise<TransactionResult<RedeemTokensResult>> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::merge_token_set`,
      arguments: [
        tx.object(params.marketId),
        tx.object(MARKET_REGISTRY),
        tx.object(params.vaultId),
        tx.object(params.yesTokenId),
        tx.object(params.noTokenId),
        tx.object(CLOCK_ID),
      ],
    });

    return this.txService.execute(tx, () => ({
      suiAmount: params.amount,
      suiAmountFormatted: `${formatBalance(params.amount)} SUI`,
    }));
  }

  /**
   * Redeem YES tokens after market resolves to YES
   */
  async redeemYes(params: RedeemTokensParams): Promise<TransactionResult<RedeemTokensResult>> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::redeem_yes`,
      arguments: [
        tx.object(params.marketId),
        tx.object(MARKET_REGISTRY),
        tx.object(params.vaultId),
        tx.object(params.tokenId),
        tx.object(CLOCK_ID),
      ],
    });

    return this.txService.execute(tx, () => ({
      suiAmount: 0, // Will be determined from event
      suiAmountFormatted: 'Redeemed',
    }));
  }

  /**
   * Redeem NO tokens after market resolves to NO
   */
  async redeemNo(params: RedeemTokensParams): Promise<TransactionResult<RedeemTokensResult>> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::redeem_no`,
      arguments: [
        tx.object(params.marketId),
        tx.object(MARKET_REGISTRY),
        tx.object(params.vaultId),
        tx.object(params.tokenId),
        tx.object(CLOCK_ID),
      ],
    });

    return this.txService.execute(tx, () => ({
      suiAmount: 0,
      suiAmountFormatted: 'Redeemed',
    }));
  }

  /**
   * Redeem tokens from a voided market
   * Returns full collateral (1 YES + 1 NO = 1 SUI)
   */
  async redeemVoided(params: RedeemVoidedParams): Promise<TransactionResult<RedeemTokensResult>> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::redeem_voided`,
      arguments: [
        tx.object(params.marketId),
        tx.object(MARKET_REGISTRY),
        tx.object(params.vaultId),
        tx.object(params.yesTokenId),
        tx.object(params.noTokenId),
        tx.object(CLOCK_ID),
      ],
    });

    return this.txService.execute(tx, () => ({
      suiAmount: 0,
      suiAmountFormatted: 'Refunded',
    }));
  }

  /**
   * Split a YES token into two
   * Note: The split token is transferred back to the sender automatically
   */
  async splitYesToken(params: SplitTokenParams, recipient: string): Promise<TransactionResult> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::split_and_transfer_yes`,
      arguments: [
        tx.object(params.tokenId),
        tx.pure.u64(params.amount),
        tx.pure.address(recipient),
      ],
    });

    return this.txService.execute(tx);
  }

  /**
   * Split a NO token into two
   * Note: The split token is transferred back to the sender automatically
   */
  async splitNoToken(params: SplitTokenParams, recipient: string): Promise<TransactionResult> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::split_and_transfer_no`,
      arguments: [
        tx.object(params.tokenId),
        tx.pure.u64(params.amount),
        tx.pure.address(recipient),
      ],
    });

    return this.txService.execute(tx);
  }

  /**
   * Merge two YES tokens into one
   */
  async mergeYesTokens(params: MergeTokensParams): Promise<TransactionResult> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::merge_yes`,
      arguments: [
        tx.object(params.targetTokenId),
        tx.object(params.sourceTokenId),
      ],
    });

    return this.txService.execute(tx);
  }

  /**
   * Merge two NO tokens into one
   */
  async mergeNoTokens(params: MergeTokensParams): Promise<TransactionResult> {
    if (!this.txService) {
      return { success: false, error: { code: 'NO_SIGNER', message: 'Wallet not connected' } };
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::token_entries::merge_no`,
      arguments: [
        tx.object(params.targetTokenId),
        tx.object(params.sourceTokenId),
      ],
    });

    return this.txService.execute(tx);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a TokenService instance
 */
export function createTokenService(client: SuiClient): TokenService {
  return new TokenService(client);
}
