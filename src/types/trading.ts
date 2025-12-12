// =============================================================================
// TRADING MODULE TYPES
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================

export const TRADING_CONSTANTS = {
  // Order Side
  SIDE_BUY: 0,
  SIDE_SELL: 1,

  // Outcome
  OUTCOME_YES: 0,
  OUTCOME_NO: 1,

  // Order Status
  STATUS_OPEN: 0,
  STATUS_FILLED: 1,
  STATUS_CANCELLED: 2,
  STATUS_PARTIAL: 3,

  // Price Limits (basis points)
  MIN_PRICE: 1, // 0.01%
  MAX_PRICE: 9999, // 99.99%
  PRICE_PRECISION: 10000, // 100% = 10000 bps

  // Order Limits
  MIN_ORDER_AMOUNT: 10_000_000, // 0.01 SUI minimum

  // AMM Constants
  MIN_LIQUIDITY: 10_000_000, // 0.01 SUI minimum
  AMM_FEE_BPS: 30, // 0.3% swap fee
} as const;

// =============================================================================
// BLOCKCHAIN TYPES (raw data from Sui)
// =============================================================================

/**
 * Raw order data as stored on-chain
 */
export interface OrderOnChain {
  id: { id: string };
  order_id: string;
  market_id: string;
  maker: string;
  side: number; // 0=BUY, 1=SELL
  outcome: number; // 0=YES, 1=NO
  price: string; // basis points (0-10000)
  amount: string;
  filled: string;
  status: number; // 0=OPEN, 1=FILLED, 2=CANCELLED, 3=PARTIAL
  created_at: string;
}

/**
 * Raw order book data as stored on-chain
 */
export interface OrderBookOnChain {
  id: { id: string };
  market_id: string;
  orders: { fields: { id: { id: string } } };
  next_order_id: string;
  open_order_count: string;
  total_volume: string;
  trade_count: string;
}

/**
 * Raw liquidity pool data as stored on-chain
 */
export interface LiquidityPoolOnChain {
  id: { id: string };
  market_id: string;
  yes_reserve: string;
  no_reserve: string;
  total_lp_tokens: string;
  total_fees_collected: string;
  is_active: boolean;
}

/**
 * Raw LP token data as stored on-chain
 */
export interface LPTokenOnChain {
  id: { id: string };
  market_id: string;
  amount: string;
  provider: string;
}

// =============================================================================
// FRONTEND TYPES (transformed for UI)
// =============================================================================

export type OrderSide = 'buy' | 'sell';
export type OrderOutcome = 'yes' | 'no';
export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'partial';

/**
 * Order for frontend display
 */
export interface Order {
  id: string;
  orderId: number;
  marketId: number;
  maker: string;
  side: OrderSide;
  outcome: OrderOutcome;
  price: number; // basis points (0-10000)
  pricePercent: number; // 0-100
  priceDecimal: number; // 0-1
  amount: number; // in MIST
  amountFormatted: string;
  filled: number;
  filledFormatted: string;
  remaining: number;
  remainingFormatted: string;
  status: OrderStatus;
  createdAt: Date;
  isOpen: boolean;
}

/**
 * Order book for frontend display
 */
export interface OrderBook {
  id: string;
  marketId: number;
  openOrderCount: number;
  totalVolume: number;
  totalVolumeFormatted: string;
  tradeCount: number;
  buyOrders: Order[]; // sorted by price descending (highest first)
  sellOrders: Order[]; // sorted by price ascending (lowest first)
  bestBid: number | null; // highest buy price
  bestAsk: number | null; // lowest sell price
  spread: number | null; // in basis points
  midPrice: number; // in basis points
}

/**
 * Liquidity pool for frontend display
 */
export interface LiquidityPool {
  id: string;
  marketId: number;
  yesReserve: number;
  yesReserveFormatted: string;
  noReserve: number;
  noReserveFormatted: string;
  totalLpTokens: number;
  totalFeesCollected: number;
  totalFeesFormatted: string;
  isActive: boolean;
  // Calculated prices
  yesPriceBps: number; // YES price in basis points
  noPriceBps: number; // NO price in basis points
  yesPricePercent: number; // 0-100
  noPricePercent: number; // 0-100
  yesPriceDecimal: number; // 0-1
  noPriceDecimal: number; // 0-1
}

/**
 * LP token for frontend display
 */
export interface LPToken {
  id: string;
  marketId: number;
  amount: number;
  amountFormatted: string;
  provider: string;
}

/**
 * Swap quote result
 */
export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  outputAmountFormatted: string;
  feeAmount: number;
  feeAmountFormatted: string;
  priceImpact: number; // as percentage
  effectivePrice: number; // basis points
  minOutput: number; // with slippage
}

/**
 * Order book depth at a price level
 */
export interface OrderBookLevel {
  price: number; // basis points
  pricePercent: number;
  totalAmount: number;
  totalAmountFormatted: string;
  orderCount: number;
}

/**
 * Order book depth summary
 */
export interface OrderBookDepth {
  buyLevels: OrderBookLevel[];
  sellLevels: OrderBookLevel[];
  totalBuyAmount: number;
  totalSellAmount: number;
  buyOrderCount: number;
  sellOrderCount: number;
}

// =============================================================================
// PARAMS FOR TRADING OPERATIONS
// =============================================================================

/**
 * Parameters for creating an order book
 */
export interface CreateOrderBookParams {
  marketId: number;
}

/**
 * Parameters for placing a buy order
 */
export interface PlaceBuyOrderParams {
  marketId: string;
  orderBookId: string;
  outcome: OrderOutcome;
  price: number; // basis points (1-9999)
  amount: number; // SUI amount in MIST
}

/**
 * Parameters for placing a sell order
 */
export interface PlaceSellOrderParams {
  marketId: string;
  orderBookId: string;
  tokenId: string; // YesToken or NoToken ID
  outcome: OrderOutcome;
  price: number; // basis points (1-9999)
}

/**
 * Parameters for cancelling an order
 */
export interface CancelOrderParams {
  orderBookId: string;
  orderId: number;
}

/**
 * Parameters for matching orders
 */
export interface MatchOrdersParams {
  orderBookId: string;
  buyOrderId: number;
  sellOrderId: number;
}

/**
 * Parameters for creating a liquidity pool
 */
export interface CreateLiquidityPoolParams {
  marketId: number;
}

/**
 * Parameters for adding liquidity
 */
export interface AddLiquidityParams {
  marketId: string;
  poolId: string;
  yesTokenId: string;
  noTokenId: string;
}

/**
 * Parameters for removing liquidity
 */
export interface RemoveLiquidityParams {
  marketId: string;
  poolId: string;
  lpTokenId: string;
}

/**
 * Parameters for swapping tokens
 */
export interface SwapParams {
  marketId: string;
  poolId: string;
  tokenId: string; // Input token ID
  inputOutcome: OrderOutcome; // 'yes' or 'no'
  minOutput: number; // Minimum output (slippage protection)
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Result from placing an order
 */
export interface PlaceOrderResult {
  orderId: number;
  transactionDigest: string;
}

/**
 * Result from matching orders
 */
export interface MatchOrdersResult {
  tradeAmount: number;
  executionPrice: number;
  transactionDigest: string;
}

/**
 * Result from adding liquidity
 */
export interface AddLiquidityResult {
  lpTokenId: string;
  lpTokenAmount: number;
  transactionDigest: string;
}

/**
 * Result from removing liquidity
 */
export interface RemoveLiquidityResult {
  yesAmount: number;
  noAmount: number;
  transactionDigest: string;
}

/**
 * Result from swap
 */
export interface SwapResult {
  inputAmount: number;
  outputAmount: number;
  feeAmount: number;
  transactionDigest: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface OrderPlacedEvent {
  orderId: number;
  marketId: number;
  maker: string;
  side: number;
  outcome: number;
  price: number;
  amount: number;
  timestamp: number;
}

export interface OrderCancelledEvent {
  orderId: number;
  marketId: number;
  maker: string;
  remainingAmount: number;
  timestamp: number;
}

export interface TradeExecutedEvent {
  tradeId: number;
  marketId: number;
  makerOrderId: number;
  maker: string;
  taker: string;
  side: number;
  outcome: number;
  price: number;
  amount: number;
  timestamp: number;
}

export interface LiquidityAddedEvent {
  marketId: number;
  provider: string;
  yesAmount: number;
  noAmount: number;
  lpTokensMinted: number;
  timestamp: number;
}

export interface LiquidityRemovedEvent {
  marketId: number;
  provider: string;
  yesAmount: number;
  noAmount: number;
  lpTokensBurned: number;
  timestamp: number;
}

export interface SwapExecutedEvent {
  marketId: number;
  trader: string;
  inputOutcome: number;
  inputAmount: number;
  outputOutcome: number;
  outputAmount: number;
  feeAmount: number;
  timestamp: number;
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const TRADING_ERRORS: Record<number, string> = {
  200: 'Market is not open for trading',
  201: 'Invalid price (must be 1-9999 basis points)',
  202: 'Order amount too small (minimum 0.01 SUI)',
  203: 'Market ID mismatch',
  204: 'Only order maker can cancel',
  205: 'Order is not open',
  206: 'Invalid order side',
  207: 'Invalid outcome',
  210: 'No matching orders found',
  212: 'Order not found',
  213: 'Liquidity pool is not active',
  214: 'Insufficient liquidity',
  215: 'Invalid LP token',
  216: 'Slippage exceeded',
  217: 'Amount cannot be zero',
};
