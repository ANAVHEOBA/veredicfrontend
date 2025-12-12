// =============================================================================
// TRADING SERVICE
// =============================================================================
// Handles all trading operations: Order Book + AMM Liquidity Pool

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG } from '@/lib/config';
import {
  type Order,
  type OrderBook,
  type LiquidityPool,
  type LPToken,
  type SwapQuote,
  type OrderBookOnChain,
  type LiquidityPoolOnChain,
  type LPTokenOnChain,
  type OrderOnChain,
  type PlaceBuyOrderParams,
  type PlaceSellOrderParams,
  type CancelOrderParams,
  type MatchOrdersParams,
  type AddLiquidityParams,
  type RemoveLiquidityParams,
  type SwapParams,
  type OrderSide,
  type OrderOutcome,
  type OrderStatus,
  TRADING_CONSTANTS,
  TRADING_ERRORS,
} from '@/types/trading';

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

function parseSide(side: number): OrderSide {
  return side === TRADING_CONSTANTS.SIDE_BUY ? 'buy' : 'sell';
}

function parseOutcome(outcome: number): OrderOutcome {
  return outcome === TRADING_CONSTANTS.OUTCOME_YES ? 'yes' : 'no';
}

function parseStatus(status: number): OrderStatus {
  switch (status) {
    case TRADING_CONSTANTS.STATUS_OPEN:
      return 'open';
    case TRADING_CONSTANTS.STATUS_FILLED:
      return 'filled';
    case TRADING_CONSTANTS.STATUS_CANCELLED:
      return 'cancelled';
    case TRADING_CONSTANTS.STATUS_PARTIAL:
      return 'partial';
    default:
      return 'open';
  }
}

function bpsToPercent(bps: number): number {
  return bps / 100;
}

function bpsToDecimal(bps: number): number {
  return bps / TRADING_CONSTANTS.PRICE_PRECISION;
}

function transformOrder(raw: OrderOnChain): Order {
  const price = Number(raw.price);
  const amount = Number(raw.amount);
  const filled = Number(raw.filled);
  const remaining = amount - filled;
  const status = parseStatus(raw.status);

  return {
    id: raw.id.id,
    orderId: Number(raw.order_id),
    marketId: Number(raw.market_id),
    maker: raw.maker,
    side: parseSide(raw.side),
    outcome: parseOutcome(raw.outcome),
    price,
    pricePercent: bpsToPercent(price),
    priceDecimal: bpsToDecimal(price),
    amount,
    amountFormatted: formatBalance(amount),
    filled,
    filledFormatted: formatBalance(filled),
    remaining,
    remainingFormatted: formatBalance(remaining),
    status,
    createdAt: new Date(Number(raw.created_at)),
    isOpen: status === 'open' || status === 'partial',
  };
}

function transformPool(raw: LiquidityPoolOnChain): LiquidityPool {
  const yesReserve = Number(raw.yes_reserve);
  const noReserve = Number(raw.no_reserve);
  const totalReserve = yesReserve + noReserve;

  // Calculate prices from reserves
  let yesPriceBps = 5000; // default 50%
  let noPriceBps = 5000;

  if (totalReserve > 0) {
    yesPriceBps = Math.round((noReserve / totalReserve) * TRADING_CONSTANTS.PRICE_PRECISION);
    noPriceBps = TRADING_CONSTANTS.PRICE_PRECISION - yesPriceBps;
  }

  return {
    id: raw.id.id,
    marketId: Number(raw.market_id),
    yesReserve,
    yesReserveFormatted: formatBalance(yesReserve),
    noReserve,
    noReserveFormatted: formatBalance(noReserve),
    totalLpTokens: Number(raw.total_lp_tokens),
    totalFeesCollected: Number(raw.total_fees_collected),
    totalFeesFormatted: formatBalance(Number(raw.total_fees_collected)),
    isActive: raw.is_active,
    yesPriceBps,
    noPriceBps,
    yesPricePercent: bpsToPercent(yesPriceBps),
    noPricePercent: bpsToPercent(noPriceBps),
    yesPriceDecimal: bpsToDecimal(yesPriceBps),
    noPriceDecimal: bpsToDecimal(noPriceBps),
  };
}

function transformLPToken(raw: LPTokenOnChain): LPToken {
  const amount = Number(raw.amount);
  return {
    id: raw.id.id,
    marketId: Number(raw.market_id),
    amount,
    amountFormatted: formatBalance(amount),
    provider: raw.provider,
  };
}

// =============================================================================
// TRADING SERVICE CLASS
// =============================================================================

export class TradingService {
  constructor(
    private client: SuiClient,
    private signAndExecute?: (tx: Transaction) => Promise<{ digest: string; effects?: any }>
  ) {}

  // ===========================================================================
  // FEATURE 1: CREATE ORDER BOOK
  // ===========================================================================

  /**
   * Build transaction to create an order book for a market
   */
  buildCreateOrderBookTx(marketId: number): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::create_order_book`,
      arguments: [
        tx.pure.u64(marketId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async createOrderBook(marketId: number): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildCreateOrderBookTx(marketId);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to create order book:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 2: PLACE BUY YES ORDER
  // ===========================================================================

  /**
   * Build transaction to place a buy order for YES tokens
   */
  buildPlaceBuyYesTx(params: PlaceBuyOrderParams): Transaction {
    const tx = new Transaction();

    const [paymentCoin] = tx.splitCoins(tx.gas, [params.amount]);

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::place_buy_yes`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.orderBookId),
        paymentCoin,
        tx.pure.u64(params.price),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async placeBuyYesOrder(params: PlaceBuyOrderParams): Promise<{ success: boolean; orderId?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildPlaceBuyYesTx(params);
      const result = await this.signAndExecute(tx);
      // TODO: Parse order ID from events
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to place buy YES order:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 3: PLACE BUY NO ORDER
  // ===========================================================================

  /**
   * Build transaction to place a buy order for NO tokens
   */
  buildPlaceBuyNoTx(params: PlaceBuyOrderParams): Transaction {
    const tx = new Transaction();

    const [paymentCoin] = tx.splitCoins(tx.gas, [params.amount]);

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::place_buy_no`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.orderBookId),
        paymentCoin,
        tx.pure.u64(params.price),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async placeBuyNoOrder(params: PlaceBuyOrderParams): Promise<{ success: boolean; orderId?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildPlaceBuyNoTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to place buy NO order:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 4: PLACE SELL YES ORDER
  // ===========================================================================

  /**
   * Build transaction to place a sell order for YES tokens
   */
  buildPlaceSellYesTx(params: PlaceSellOrderParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::place_sell_yes`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.orderBookId),
        tx.object(params.tokenId),
        tx.pure.u64(params.price),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async placeSellYesOrder(params: PlaceSellOrderParams): Promise<{ success: boolean; orderId?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildPlaceSellYesTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to place sell YES order:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 5: PLACE SELL NO ORDER
  // ===========================================================================

  /**
   * Build transaction to place a sell order for NO tokens
   */
  buildPlaceSellNoTx(params: PlaceSellOrderParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::place_sell_no`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.orderBookId),
        tx.object(params.tokenId),
        tx.pure.u64(params.price),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async placeSellNoOrder(params: PlaceSellOrderParams): Promise<{ success: boolean; orderId?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildPlaceSellNoTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to place sell NO order:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // UNIFIED PLACE ORDER METHODS
  // ===========================================================================

  /**
   * Place a buy order for either YES or NO tokens
   */
  async placeBuyOrder(params: PlaceBuyOrderParams): Promise<{ success: boolean; orderId?: number; digest?: string; error?: Error }> {
    if (params.outcome === 'yes') {
      return this.placeBuyYesOrder(params);
    } else {
      return this.placeBuyNoOrder(params);
    }
  }

  /**
   * Place a sell order for either YES or NO tokens
   */
  async placeSellOrder(params: PlaceSellOrderParams): Promise<{ success: boolean; orderId?: number; digest?: string; error?: Error }> {
    if (params.outcome === 'yes') {
      return this.placeSellYesOrder(params);
    } else {
      return this.placeSellNoOrder(params);
    }
  }

  // ===========================================================================
  // FEATURE 6: CANCEL ORDER
  // ===========================================================================

  /**
   * Build transaction to cancel an order
   */
  buildCancelOrderTx(params: CancelOrderParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::cancel_order`,
      arguments: [
        tx.object(params.orderBookId),
        tx.pure.u64(params.orderId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async cancelOrder(params: CancelOrderParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildCancelOrderTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 7: MATCH ORDERS
  // ===========================================================================

  /**
   * Build transaction to match two orders
   */
  buildMatchOrdersTx(params: MatchOrdersParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::match_orders`,
      arguments: [
        tx.object(params.orderBookId),
        tx.pure.u64(params.buyOrderId),
        tx.pure.u64(params.sellOrderId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async matchOrders(params: MatchOrdersParams): Promise<{ success: boolean; tradeAmount?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildMatchOrdersTx(params);
      const result = await this.signAndExecute(tx);
      // TODO: Parse trade amount from events
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to match orders:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 8: CREATE LIQUIDITY POOL
  // ===========================================================================

  /**
   * Build transaction to create a liquidity pool
   */
  buildCreateLiquidityPoolTx(marketId: number): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::create_liquidity_pool`,
      arguments: [
        tx.pure.u64(marketId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async createLiquidityPool(marketId: number): Promise<{ success: boolean; poolId?: string; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildCreateLiquidityPoolTx(marketId);
      const result = await this.signAndExecute(tx);
      // TODO: Parse pool ID from created objects
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to create liquidity pool:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 9: ADD LIQUIDITY
  // ===========================================================================

  /**
   * Build transaction to add liquidity to a pool
   */
  buildAddLiquidityTx(params: AddLiquidityParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::add_liquidity`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.poolId),
        tx.object(params.yesTokenId),
        tx.object(params.noTokenId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async addLiquidity(params: AddLiquidityParams): Promise<{ success: boolean; lpTokenId?: string; lpAmount?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildAddLiquidityTx(params);
      const result = await this.signAndExecute(tx);
      // TODO: Parse LP token ID and amount from events/created objects
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to add liquidity:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 10: REMOVE LIQUIDITY
  // ===========================================================================

  /**
   * Build transaction to remove liquidity from a pool
   */
  buildRemoveLiquidityTx(params: RemoveLiquidityParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::remove_liquidity`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.poolId),
        tx.object(params.lpTokenId),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async removeLiquidity(params: RemoveLiquidityParams): Promise<{ success: boolean; yesAmount?: number; noAmount?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildRemoveLiquidityTx(params);
      const result = await this.signAndExecute(tx);
      // TODO: Parse returned amounts from events
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to remove liquidity:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 11: SWAP YES FOR NO
  // ===========================================================================

  /**
   * Build transaction to swap YES tokens for NO tokens
   */
  buildSwapYesForNoTx(params: SwapParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::swap_yes_for_no`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.poolId),
        tx.object(params.tokenId),
        tx.pure.u64(params.minOutput),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async swapYesForNo(params: SwapParams): Promise<{ success: boolean; outputAmount?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildSwapYesForNoTx(params);
      const result = await this.signAndExecute(tx);
      // TODO: Parse output amount from events
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to swap YES for NO:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 12: SWAP NO FOR YES
  // ===========================================================================

  /**
   * Build transaction to swap NO tokens for YES tokens
   */
  buildSwapNoForYesTx(params: SwapParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::trading_entries::swap_no_for_yes`,
      arguments: [
        tx.object(params.marketId),
        tx.object(params.poolId),
        tx.object(params.tokenId),
        tx.pure.u64(params.minOutput),
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async swapNoForYes(params: SwapParams): Promise<{ success: boolean; outputAmount?: number; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildSwapNoForYesTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to swap NO for YES:', error);
      return { success: false, error };
    }
  }

  /**
   * Unified swap method
   */
  async swap(params: SwapParams): Promise<{ success: boolean; outputAmount?: number; digest?: string; error?: Error }> {
    if (params.inputOutcome === 'yes') {
      return this.swapYesForNo(params);
    } else {
      return this.swapNoForYes(params);
    }
  }

  // ===========================================================================
  // FEATURE 13: GET ORDER BOOK
  // ===========================================================================

  /**
   * Get order book data for a market
   */
  async getOrderBook(orderBookId: string): Promise<OrderBook | null> {
    try {
      const response = await this.client.getObject({
        id: orderBookId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as OrderBookOnChain;

      // TODO: Query individual orders from the table
      // For now, return basic stats without orders
      const totalVolume = Number(fields.total_volume);

      return {
        id: orderBookId,
        marketId: Number(fields.market_id),
        openOrderCount: Number(fields.open_order_count),
        totalVolume,
        totalVolumeFormatted: formatBalance(totalVolume),
        tradeCount: Number(fields.trade_count),
        buyOrders: [],
        sellOrders: [],
        bestBid: null,
        bestAsk: null,
        spread: null,
        midPrice: 5000, // Default 50%
      };
    } catch (error) {
      console.error('Failed to get order book:', error);
      return null;
    }
  }

  /**
   * Find order book for a market by querying events
   */
  async findOrderBookForMarket(marketId: number): Promise<string | null> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::OrderBookCreated`,
        },
        limit: 100,
      });

      for (const event of events.data) {
        const parsed = event.parsedJson as { market_id: string };
        if (Number(parsed.market_id) === marketId) {
          // Get the transaction to extract created objects
          const txResponse = await this.client.getTransactionBlock({
            digest: event.id.txDigest,
            options: { showObjectChanges: true },
          });

          // Find the OrderBook object that was created
          const orderBookCreated = txResponse.objectChanges?.find(
            (change) =>
              change.type === 'created' &&
              change.objectType?.includes('::trading_types::OrderBook')
          );

          if (orderBookCreated && 'objectId' in orderBookCreated) {
            return orderBookCreated.objectId;
          }

          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find order book:', error);
      return null;
    }
  }

  // ===========================================================================
  // FEATURE 14: GET POOL PRICE / LIQUIDITY POOL INFO
  // ===========================================================================

  /**
   * Get liquidity pool data
   */
  async getLiquidityPool(poolId: string): Promise<LiquidityPool | null> {
    try {
      const response = await this.client.getObject({
        id: poolId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as LiquidityPoolOnChain;
      return transformPool(fields);
    } catch (error) {
      console.error('Failed to get liquidity pool:', error);
      return null;
    }
  }

  /**
   * Find liquidity pool for a market by querying events
   */
  async findLiquidityPoolForMarket(marketId: number): Promise<string | null> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::LiquidityPoolCreated`,
        },
        limit: 100,
      });

      for (const event of events.data) {
        const parsed = event.parsedJson as { market_id: string };
        if (Number(parsed.market_id) === marketId) {
          // Get the transaction to extract created objects
          const txResponse = await this.client.getTransactionBlock({
            digest: event.id.txDigest,
            options: { showObjectChanges: true },
          });

          // Find the LiquidityPool object that was created
          const poolCreated = txResponse.objectChanges?.find(
            (change) =>
              change.type === 'created' &&
              change.objectType?.includes('::trading_types::LiquidityPool')
          );

          if (poolCreated && 'objectId' in poolCreated) {
            return poolCreated.objectId;
          }

          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find liquidity pool:', error);
      return null;
    }
  }

  /**
   * Get pool price (YES and NO prices in basis points)
   */
  async getPoolPrice(poolId: string): Promise<{ yesPriceBps: number; noPriceBps: number } | null> {
    const pool = await this.getLiquidityPool(poolId);
    if (!pool) return null;

    return {
      yesPriceBps: pool.yesPriceBps,
      noPriceBps: pool.noPriceBps,
    };
  }

  // ===========================================================================
  // SWAP QUOTE CALCULATIONS (Client-side)
  // ===========================================================================

  /**
   * Calculate expected output for a swap (client-side calculation)
   */
  calculateSwapOutput(
    inputAmount: number,
    inputReserve: number,
    outputReserve: number,
    feeBps: number = TRADING_CONSTANTS.AMM_FEE_BPS
  ): { outputAmount: number; feeAmount: number } {
    if (inputReserve === 0 || outputReserve === 0 || inputAmount === 0) {
      return { outputAmount: 0, feeAmount: 0 };
    }

    // Constant product formula with fee
    const inputWithFee = BigInt(inputAmount) * BigInt(10000 - feeBps);
    const numerator = inputWithFee * BigInt(outputReserve);
    const denominator = BigInt(inputReserve) * BigInt(10000) + inputWithFee;
    const outputAmount = Number(numerator / denominator);
    const feeAmount = Math.floor((inputAmount * feeBps) / 10000);

    return { outputAmount, feeAmount };
  }

  /**
   * Get a swap quote for YES -> NO
   */
  async getSwapQuoteYesForNo(poolId: string, inputAmount: number, slippageBps: number = 100): Promise<SwapQuote | null> {
    const pool = await this.getLiquidityPool(poolId);
    if (!pool) return null;

    const { outputAmount, feeAmount } = this.calculateSwapOutput(
      inputAmount,
      pool.yesReserve,
      pool.noReserve
    );

    // Calculate price impact
    const spotPrice = pool.noReserve / pool.yesReserve;
    const executionPrice = outputAmount / inputAmount;
    const priceImpact = Math.abs((executionPrice - spotPrice) / spotPrice) * 100;

    // Calculate min output with slippage
    const minOutput = Math.floor((outputAmount * (10000 - slippageBps)) / 10000);

    return {
      inputAmount,
      outputAmount,
      outputAmountFormatted: formatBalance(outputAmount),
      feeAmount,
      feeAmountFormatted: formatBalance(feeAmount),
      priceImpact,
      effectivePrice: outputAmount > 0 ? Math.round((inputAmount / outputAmount) * TRADING_CONSTANTS.PRICE_PRECISION) : 0,
      minOutput,
    };
  }

  /**
   * Get a swap quote for NO -> YES
   */
  async getSwapQuoteNoForYes(poolId: string, inputAmount: number, slippageBps: number = 100): Promise<SwapQuote | null> {
    const pool = await this.getLiquidityPool(poolId);
    if (!pool) return null;

    const { outputAmount, feeAmount } = this.calculateSwapOutput(
      inputAmount,
      pool.noReserve,
      pool.yesReserve
    );

    // Calculate price impact
    const spotPrice = pool.yesReserve / pool.noReserve;
    const executionPrice = outputAmount / inputAmount;
    const priceImpact = Math.abs((executionPrice - spotPrice) / spotPrice) * 100;

    // Calculate min output with slippage
    const minOutput = Math.floor((outputAmount * (10000 - slippageBps)) / 10000);

    return {
      inputAmount,
      outputAmount,
      outputAmountFormatted: formatBalance(outputAmount),
      feeAmount,
      feeAmountFormatted: formatBalance(feeAmount),
      priceImpact,
      effectivePrice: outputAmount > 0 ? Math.round((inputAmount / outputAmount) * TRADING_CONSTANTS.PRICE_PRECISION) : 0,
      minOutput,
    };
  }

  /**
   * Unified swap quote
   */
  async getSwapQuote(poolId: string, inputAmount: number, inputOutcome: OrderOutcome, slippageBps: number = 100): Promise<SwapQuote | null> {
    if (inputOutcome === 'yes') {
      return this.getSwapQuoteYesForNo(poolId, inputAmount, slippageBps);
    } else {
      return this.getSwapQuoteNoForYes(poolId, inputAmount, slippageBps);
    }
  }

  // ===========================================================================
  // LP TOKEN QUERIES
  // ===========================================================================

  /**
   * Get user's LP tokens for a market
   */
  async getUserLPTokens(address: string, marketId?: number): Promise<LPToken[]> {
    try {
      const response = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::trading_types::LPToken`,
        },
        options: { showContent: true },
      });

      const tokens: LPToken[] = [];

      for (const obj of response.data) {
        if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') continue;

        const fields = obj.data.content.fields as unknown as LPTokenOnChain;
        const token = transformLPToken(fields);

        // Filter by market if specified
        if (marketId !== undefined && token.marketId !== marketId) continue;

        tokens.push(token);
      }

      return tokens;
    } catch (error) {
      console.error('Failed to get LP tokens:', error);
      return [];
    }
  }

  // ===========================================================================
  // EVENT QUERIES
  // ===========================================================================

  /**
   * Get recent trades for a market
   */
  async getRecentTrades(marketId: number, limit: number = 50) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::TradeExecuted`,
        },
        limit,
        order: 'descending',
      });

      return events.data
        .filter((e) => {
          const parsed = e.parsedJson as { market_id: string };
          return Number(parsed.market_id) === marketId;
        })
        .map((e) => e.parsedJson);
    } catch (error) {
      console.error('Failed to get recent trades:', error);
      return [];
    }
  }

  /**
   * Get recent swaps for a market
   */
  async getRecentSwaps(marketId: number, limit: number = 50) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::SwapExecuted`,
        },
        limit,
        order: 'descending',
      });

      return events.data
        .filter((e) => {
          const parsed = e.parsedJson as { market_id: string };
          return Number(parsed.market_id) === marketId;
        })
        .map((e) => e.parsedJson);
    } catch (error) {
      console.error('Failed to get recent swaps:', error);
      return [];
    }
  }

  /**
   * Get user's order history
   */
  async getUserOrderHistory(address: string, limit: number = 50) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::OrderPlaced`,
        },
        limit,
        order: 'descending',
      });

      return events.data
        .filter((e) => {
          const parsed = e.parsedJson as { maker: string };
          return parsed.maker === address;
        })
        .map((e) => e.parsedJson);
    } catch (error) {
      console.error('Failed to get user order history:', error);

      return [];
    }
  }

  /**
   * Get user's open orders for a specific market
   * Queries OrderPlaced events and filters out cancelled/filled orders
   */
  async getUserOpenOrders(address: string, marketId: number) {
    try {
      // Get all order placed events for the market
      const placedEvents = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::OrderPlaced`,
        },
        limit: 100,
        order: 'descending',
      });

      // Get cancelled order IDs
      const cancelledEvents = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::OrderCancelled`,
        },
        limit: 100,
        order: 'descending',
      });

      // Get filled order IDs (from trades)
      const tradeEvents = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::trading_events::TradeExecuted`,
        },
        limit: 100,
        order: 'descending',
      });

      // Build sets of cancelled and filled order IDs
      const cancelledOrderIds = new Set<string>();
      const filledOrderIds = new Set<string>();

      for (const event of cancelledEvents.data) {
        const parsed = event.parsedJson as { order_id: string; market_id: string };
        if (Number(parsed.market_id) === marketId) {
          cancelledOrderIds.add(parsed.order_id);
        }
      }

      for (const event of tradeEvents.data) {
        const parsed = event.parsedJson as { buy_order_id: string; sell_order_id: string; market_id: string };
        if (Number(parsed.market_id) === marketId) {
          // Note: Orders might be partially filled, this is a simplification
          filledOrderIds.add(parsed.buy_order_id);
          filledOrderIds.add(parsed.sell_order_id);
        }
      }

      // Filter to user's open orders for this market
      const openOrders = placedEvents.data
        .filter((e) => {
          const parsed = e.parsedJson as {
            maker: string;
            market_id: string;
            order_id: string;
          };
          return (
            parsed.maker === address &&
            Number(parsed.market_id) === marketId &&
            !cancelledOrderIds.has(parsed.order_id) &&
            !filledOrderIds.has(parsed.order_id)
          );
        })
        .map((e) => e.parsedJson);

      return openOrders;
    } catch (error) {
      console.error('Failed to get user open orders:', error);
      return [];
    }
  }
}

// =============================================================================
// ERROR HELPER
// =============================================================================

export function getTradingErrorMessage(code: number): string {
  return TRADING_ERRORS[code] || `Unknown trading error (code: ${code})`;
}
