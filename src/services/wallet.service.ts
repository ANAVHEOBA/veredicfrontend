// =============================================================================
// WALLET SERVICE
// =============================================================================
// Handles all proxy wallet operations: deployment, deposits, withdrawals, approvals

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG } from '@/lib/config';
import {
  type ProxyWallet,
  type WalletFactory,
  type Approval,
  type ProxyWalletOnChain,
  type WalletFactoryOnChain,
  type ApprovalOnChain,
  type DeployWalletParams,
  type DepositSuiParams,
  type WithdrawSuiParams,
  type DepositTokenParams,
  type WithdrawTokenParams,
  type GrantApprovalParams,
  type RevokeApprovalParams,
  type TransferOwnershipParams,
  WALLET_CONSTANTS,
  WALLET_STATUS_NAMES,
  SCOPE_NAMES,
  WALLET_ERRORS,
} from '@/types/wallet';

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

function transformProxyWallet(raw: ProxyWalletOnChain): ProxyWallet {
  const status = Number(raw.status || 0);
  const suiBalance = Number(raw.sui_balance?.value || 0);

  return {
    id: raw.id.id,
    owner: raw.owner,
    nonce: Number(raw.nonce || 0),
    createdAt: new Date(Number(raw.created_at || 0)),
    status,
    statusName: WALLET_STATUS_NAMES[status] || 'Unknown',
    suiBalance,
    suiBalanceFormatted: formatBalance(suiBalance),
    yesTokenMarketIds: [], // Fetched separately
    noTokenMarketIds: [],
    lpTokenMarketIds: [],
    isActive: status === WALLET_CONSTANTS.STATUS_ACTIVE,
    isLocked: status === WALLET_CONSTANTS.STATUS_LOCKED,
  };
}

function transformWalletFactory(raw: WalletFactoryOnChain): WalletFactory {
  const deploymentFee = Number(raw.deployment_fee || 0);
  const collectedFees = Number(raw.collected_fees?.value || 0);

  return {
    id: raw.id.id,
    admin: raw.admin,
    walletCount: Number(raw.wallet_count || 0),
    deploymentFee,
    deploymentFeeFormatted: formatBalance(deploymentFee),
    collectedFees,
    collectedFeesFormatted: formatBalance(collectedFees),
  };
}

function transformApproval(raw: ApprovalOnChain, currentTime: number): Approval {
  const scope = Number(raw.scope || 0);
  const limit = Number(raw.limit || 0);
  const expiry = Number(raw.expiry || 0);
  const used = Number(raw.used || 0);
  const remaining = Math.max(0, limit - used);
  const isExpired = expiry > 0 && currentTime > expiry;
  const isValid = !isExpired && used < limit;

  return {
    operator: raw.operator,
    scope,
    scopeName: SCOPE_NAMES[scope] || 'Unknown',
    limit,
    limitFormatted: formatBalance(limit),
    expiry: expiry > 0 ? new Date(expiry) : null,
    used,
    usedFormatted: formatBalance(used),
    remaining,
    remainingFormatted: formatBalance(remaining),
    isValid,
    isExpired,
    percentUsed: limit > 0 ? (used / limit) * 100 : 0,
  };
}

// =============================================================================
// WALLET SERVICE CLASS
// =============================================================================

export class WalletService {
  constructor(
    private client: SuiClient,
    private signAndExecute?: (tx: Transaction) => Promise<{ digest: string; effects?: any }>
  ) {}

  // ===========================================================================
  // FEATURE 1: DEPLOY WALLET
  // ===========================================================================

  /**
   * Build transaction to deploy a proxy wallet
   */
  buildDeployWalletTx(params: DeployWalletParams): Transaction {
    const tx = new Transaction();

    // Split coin for payment
    const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.paymentAmount)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::wallet_entries::deploy_wallet`,
      arguments: [
        tx.object(params.factoryId),
        paymentCoin,
        tx.object(CLOCK_ID),
      ],
    });

    return tx;
  }

  async deployWallet(params: DeployWalletParams): Promise<{ success: boolean; digest?: string; walletId?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildDeployWalletTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to deploy wallet:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 2: DEPOSIT SUI
  // ===========================================================================

  /**
   * Build transaction to deposit SUI into wallet
   */
  buildDepositSuiTx(params: DepositSuiParams): Transaction {
    const tx = new Transaction();

    // Split coin for deposit
    const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.amount)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::wallet_entries::deposit_sui`,
      arguments: [
        tx.object(params.walletId),
        depositCoin,
      ],
    });

    return tx;
  }

  async depositSui(params: DepositSuiParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildDepositSuiTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to deposit SUI:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 3: WITHDRAW SUI
  // ===========================================================================

  /**
   * Build transaction to withdraw SUI from wallet
   */
  buildWithdrawSuiTx(params: WithdrawSuiParams): Transaction {
    const tx = new Transaction();

    if (params.recipient) {
      tx.moveCall({
        target: `${PACKAGE_ID}::wallet_entries::withdraw_sui_to`,
        arguments: [
          tx.object(params.walletId),
          tx.pure.u64(params.amount),
          tx.pure.address(params.recipient),
        ],
      });
    } else {
      tx.moveCall({
        target: `${PACKAGE_ID}::wallet_entries::withdraw_sui`,
        arguments: [
          tx.object(params.walletId),
          tx.pure.u64(params.amount),
        ],
      });
    }

    return tx;
  }

  async withdrawSui(params: WithdrawSuiParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildWithdrawSuiTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to withdraw SUI:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 4: DEPOSIT TOKENS
  // ===========================================================================

  /**
   * Build transaction to deposit tokens into wallet
   */
  buildDepositTokenTx(params: DepositTokenParams): Transaction {
    const tx = new Transaction();

    const targetMap = {
      yes: 'deposit_yes_token',
      no: 'deposit_no_token',
      lp: 'deposit_lp_token',
    };

    tx.moveCall({
      target: `${PACKAGE_ID}::wallet_entries::${targetMap[params.tokenType]}`,
      arguments: [
        tx.object(params.walletId),
        tx.object(params.tokenId),
      ],
    });

    return tx;
  }

  async depositToken(params: DepositTokenParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildDepositTokenTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to deposit token:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 5: WITHDRAW TOKENS
  // ===========================================================================

  /**
   * Build transaction to withdraw tokens from wallet
   */
  buildWithdrawTokenTx(params: WithdrawTokenParams): Transaction {
    const tx = new Transaction();

    const targetMap = {
      yes: params.recipient ? 'withdraw_yes_token_to' : 'withdraw_yes_token',
      no: params.recipient ? 'withdraw_no_token_to' : 'withdraw_no_token',
      lp: params.recipient ? 'withdraw_lp_token_to' : 'withdraw_lp_token',
    };

    const args = params.recipient
      ? [tx.object(params.walletId), tx.pure.u64(params.marketId), tx.pure.address(params.recipient)]
      : [tx.object(params.walletId), tx.pure.u64(params.marketId)];

    tx.moveCall({
      target: `${PACKAGE_ID}::wallet_entries::${targetMap[params.tokenType]}`,
      arguments: args,
    });

    return tx;
  }

  async withdrawToken(params: WithdrawTokenParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildWithdrawTokenTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to withdraw token:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 6: LOCK/UNLOCK WALLET
  // ===========================================================================

  /**
   * Build transaction to lock wallet
   */
  buildLockWalletTx(walletId: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::wallet_entries::lock_wallet`,
      arguments: [tx.object(walletId)],
    });

    return tx;
  }

  async lockWallet(walletId: string): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildLockWalletTx(walletId);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to lock wallet:', error);
      return { success: false, error };
    }
  }

  /**
   * Build transaction to unlock wallet
   */
  buildUnlockWalletTx(walletId: string): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::wallet_entries::unlock_wallet`,
      arguments: [tx.object(walletId)],
    });

    return tx;
  }

  async unlockWallet(walletId: string): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildUnlockWalletTx(walletId);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to unlock wallet:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // FEATURE 7: TRANSFER OWNERSHIP
  // ===========================================================================

  /**
   * Build transaction to transfer wallet ownership
   */
  buildTransferOwnershipTx(params: TransferOwnershipParams): Transaction {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::wallet_entries::transfer_ownership`,
      arguments: [
        tx.object(params.walletId),
        tx.pure.address(params.newOwner),
      ],
    });

    return tx;
  }

  async transferOwnership(params: TransferOwnershipParams): Promise<{ success: boolean; digest?: string; error?: Error }> {
    if (!this.signAndExecute) {
      return { success: false, error: new Error('Signer not available') };
    }

    try {
      const tx = this.buildTransferOwnershipTx(params);
      const result = await this.signAndExecute(tx);
      return { success: true, digest: result.digest };
    } catch (error: any) {
      console.error('Failed to transfer ownership:', error);
      return { success: false, error };
    }
  }

  // ===========================================================================
  // QUERY: GET WALLET FACTORY
  // ===========================================================================

  /**
   * Get the wallet factory
   */
  async getWalletFactory(factoryId: string): Promise<WalletFactory | null> {
    try {
      const response = await this.client.getObject({
        id: factoryId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as WalletFactoryOnChain;
      return transformWalletFactory(fields);
    } catch (error) {
      console.error('Failed to get wallet factory:', error);
      return null;
    }
  }

  /**
   * Find wallet factory by querying events
   */
  async findWalletFactory(): Promise<string | null> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::wallet_events::WalletFactoryInitialized`,
        },
        limit: 1,
      });

      if (events.data.length > 0) {
        const parsed = events.data[0].parsedJson as { factory_id: string };
        return parsed.factory_id;
      }

      return null;
    } catch (error) {
      console.error('Failed to find wallet factory:', error);
      return null;
    }
  }

  // ===========================================================================
  // QUERY: GET PROXY WALLET
  // ===========================================================================

  /**
   * Get proxy wallet by ID
   */
  async getProxyWallet(walletId: string): Promise<ProxyWallet | null> {
    try {
      const response = await this.client.getObject({
        id: walletId,
        options: { showContent: true },
      });

      if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = response.data.content.fields as unknown as ProxyWalletOnChain;
      return transformProxyWallet(fields);
    } catch (error) {
      console.error('Failed to get proxy wallet:', error);
      return null;
    }
  }

  /**
   * Find proxy wallet for a user
   */
  async findUserProxyWallet(address: string): Promise<string | null> {
    try {
      // Query wallet deployment events for this user
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::wallet_events::WalletDeployed`,
        },
        limit: 100,
        order: 'descending',
      });

      for (const event of events.data) {
        const parsed = event.parsedJson as { owner: string; wallet_id: string };
        if (parsed.owner === address) {
          return parsed.wallet_id;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find user proxy wallet:', error);
      return null;
    }
  }

  /**
   * Get user's proxy wallet (finds and fetches)
   */
  async getUserProxyWallet(address: string): Promise<ProxyWallet | null> {
    const walletId = await this.findUserProxyWallet(address);
    if (!walletId) return null;
    return this.getProxyWallet(walletId);
  }

  // ===========================================================================
  // EVENT QUERIES
  // ===========================================================================

  /**
   * Get wallet transaction history
   */
  async getWalletHistory(walletId: string, limit: number = 50) {
    try {
      const [deposits, withdrawals] = await Promise.all([
        this.client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::wallet_events::SuiDeposited` },
          limit,
          order: 'descending',
        }),
        this.client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::wallet_events::SuiWithdrawn` },
          limit,
          order: 'descending',
        }),
      ]);

      const history = [
        ...deposits.data.filter((e) => (e.parsedJson as any).wallet_id === walletId)
          .map((e) => ({ type: 'deposit' as const, ...(e.parsedJson as object) })),
        ...withdrawals.data.filter((e) => (e.parsedJson as any).wallet_id === walletId)
          .map((e) => ({ type: 'withdrawal' as const, ...(e.parsedJson as object) })),
      ];

      return history.sort((a, b) => (b as any).timestamp - (a as any).timestamp);
    } catch (error) {
      console.error('Failed to get wallet history:', error);
      return [];
    }
  }
}

// =============================================================================
// ERROR HELPER
// =============================================================================

export function getWalletErrorMessage(code: number): string {
  return WALLET_ERRORS[code] || `Unknown wallet error (code: ${code})`;
}
