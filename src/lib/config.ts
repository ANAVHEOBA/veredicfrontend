// Network configuration
export const NETWORK = "testnet" as const;

// Contract addresses (testnet deployment)
export const CONTRACT_CONFIG = {
  PACKAGE_ID: "0x9d006bf5d2141570cf19e4cee42ed9638db7aff56cb30ad1a4b1aa212caf9adb",
  MARKET_REGISTRY: "0xdb9b4975c219f9bfe8755031d467a274c94eacb317f7dbb144c5285a023fdc10",
  ADMIN_CAP: "0xf729d4b7c157cfa3e1cda4098caf2a57fe7e60ffff8be62e46bda906ec4ff462",
  UPGRADE_CAP: "0xc11f4572360048eb24ef64967b4a1f0c419ec7318aa849e448252d33fc54291d",
} as const;

// RPC endpoints
export const RPC_URLS = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
} as const;

// zkLogin configuration
export const ZKLOGIN_CONFIG = {
  // Google OAuth
  GOOGLE_CLIENT_ID: "153387979068-ki786t0s9s2u3tb1nhegsb7h7uo5s62i.apps.googleusercontent.com",

  // Redirect URI for OAuth
  REDIRECT_URI: typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "",

  // Prover service (Mysten Labs hosted)
  PROVER_URL: "https://prover-dev.mystenlabs.com/v1",

  // Salt service (you can use your own backend or Mysten's)
  SALT_SERVICE_URL: "https://salt.api.mystenlabs.com/get_salt",
} as const;

// Resolution Types (new contract only supports ADMIN and ORACLE)
export const RESOLUTION_TYPE = {
  ADMIN: 0,
  ORACLE: 1,
} as const;

// Market Status
export const MARKET_STATUS = {
  OPEN: 0,
  TRADING_ENDED: 1,
  RESOLVED: 2,
  VOIDED: 3,
} as const;

// Outcomes
export const OUTCOME = {
  YES: 0,
  NO: 1,
} as const;

// Order Side
export const ORDER_SIDE = {
  BUY: 0,
  SELL: 1,
} as const;

// Token Type
export const TOKEN_TYPE = {
  YES: 0,
  NO: 1,
} as const;
