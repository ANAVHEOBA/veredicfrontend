'use client';

import { useState } from 'react';
import {
  useProxyWalletData,
  useDeployWallet,
  useDepositSui,
  useWithdrawSui,
  useLockWallet,
  useUnlockWallet,
} from '@/lib/hooks/useWallet';
import { useAuth } from '@/providers/AuthProvider';
import { WALLET_STATUS_COLORS, WALLET_STATUS_NAMES, WALLET_CONSTANTS } from '@/types/wallet';

interface ProxyWalletPanelProps {
  onConnect?: () => void;
}

function formatSUI(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (sui >= 1_000_000) return `${(sui / 1_000_000).toFixed(2)}M`;
  if (sui >= 1_000) return `${(sui / 1_000).toFixed(2)}K`;
  if (sui >= 1) return sui.toFixed(4);
  if (sui >= 0.0001) return sui.toFixed(6);
  return '0';
}

function StatusBadge({ status }: { status: number }) {
  const colors = WALLET_STATUS_COLORS[status] || WALLET_STATUS_COLORS[0];
  const name = WALLET_STATUS_NAMES[status] || 'Unknown';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === WALLET_CONSTANTS.STATUS_ACTIVE ? 'bg-green-500' : 'bg-red-500'}`} />
      {name}
    </span>
  );
}

export default function ProxyWalletPanel({ onConnect }: ProxyWalletPanelProps) {
  const { user } = useAuth();
  const isConnected = !!user?.address;

  const {
    factory,
    wallet,
    isLoading,
    hasWallet,
    isLocked,
    suiBalance,
    suiBalanceFormatted,
    deploymentFee,
    deploymentFeeFormatted,
  } = useProxyWalletData();

  const deployWalletMutation = useDeployWallet();
  const depositSuiMutation = useDepositSui();
  const withdrawSuiMutation = useWithdrawSui();
  const lockWalletMutation = useLockWallet();
  const unlockWalletMutation = useUnlockWallet();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!factory?.id) return;
    try {
      await deployWalletMutation.mutateAsync({
        factoryId: factory.id,
        paymentAmount: deploymentFee,
      });
      setShowSuccess('Proxy wallet deployed successfully!');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to deploy wallet:', error);
    }
  };

  const handleDeposit = async () => {
    if (!wallet?.id || !depositAmount) return;
    const amountMist = Math.floor(parseFloat(depositAmount) * 1_000_000_000);
    if (isNaN(amountMist) || amountMist <= 0) return;

    try {
      await depositSuiMutation.mutateAsync({
        walletId: wallet.id,
        amount: amountMist,
      });
      setDepositAmount('');
      setShowDeposit(false);
      setShowSuccess('SUI deposited successfully!');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to deposit:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet?.id || !withdrawAmount) return;
    const amountMist = Math.floor(parseFloat(withdrawAmount) * 1_000_000_000);
    if (isNaN(amountMist) || amountMist <= 0 || amountMist > suiBalance) return;

    try {
      await withdrawSuiMutation.mutateAsync({
        walletId: wallet.id,
        amount: amountMist,
      });
      setWithdrawAmount('');
      setShowWithdraw(false);
      setShowSuccess('SUI withdrawn successfully!');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to withdraw:', error);
    }
  };

  const handleLock = async () => {
    if (!wallet?.id) return;
    try {
      await lockWalletMutation.mutateAsync(wallet.id);
      setShowSuccess('Wallet locked');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to lock wallet:', error);
    }
  };

  const handleUnlock = async () => {
    if (!wallet?.id) return;
    try {
      await unlockWalletMutation.mutateAsync(wallet.id);
      setShowSuccess('Wallet unlocked');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="card p-3 md:p-5">
        <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-3">
          Proxy Wallet
        </h3>
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--gray-400)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <p className="text-sm text-[var(--gray-500)] mb-3">
            Connect your wallet to use proxy wallet features
          </p>
          {onConnect && (
            <button
              onClick={onConnect}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-3 md:p-5 animate-pulse">
        <div className="h-5 bg-[var(--gray-200)] rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-[var(--gray-100)] rounded-lg" />
          <div className="h-10 bg-[var(--gray-100)] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3 md:p-5">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)]">
          Proxy Wallet
        </h3>
        {wallet && <StatusBadge status={wallet.status} />}
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-xs text-green-700 font-medium">{showSuccess}</span>
          </div>
        </div>
      )}

      {/* No Wallet - Deploy */}
      {!hasWallet && (
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M12 12h.01" />
              <path d="M17 9h.01" />
              <path d="M7 9h.01" />
            </svg>
          </div>
          <h4 className="text-sm font-medium text-[var(--foreground)] mb-1">Deploy Proxy Wallet</h4>
          <p className="text-[10px] text-[var(--gray-500)] mb-3 max-w-xs mx-auto">
            A proxy wallet enables gasless transactions and advanced features like delegation.
          </p>
          <div className="text-xs text-[var(--gray-500)] mb-3">
            Deployment fee: <span className="font-medium">{deploymentFeeFormatted}</span>
          </div>
          <button
            onClick={handleDeploy}
            disabled={deployWalletMutation.isPending}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
          >
            {deployWalletMutation.isPending ? 'Deploying...' : 'Deploy Wallet'}
          </button>
          {deployWalletMutation.error && (
            <p className="mt-2 text-[10px] text-[var(--danger)]">{deployWalletMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Has Wallet - Show Balance and Actions */}
      {hasWallet && wallet && (
        <div className="space-y-4">
          {/* Balance */}
          <div className="p-3 bg-[var(--gray-50)] rounded-lg">
            <div className="text-xs text-[var(--gray-500)] mb-1">Wallet Balance</div>
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {suiBalanceFormatted} <span className="text-sm font-normal text-[var(--gray-400)]">SUI</span>
            </div>
          </div>

          {/* Deposit Form */}
          {showDeposit ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount in SUI"
                  step="0.0001"
                  min="0"
                  className="flex-1 px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                />
                <button
                  onClick={handleDeposit}
                  disabled={depositSuiMutation.isPending || !depositAmount}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {depositSuiMutation.isPending ? '...' : 'Deposit'}
                </button>
                <button
                  onClick={() => {
                    setShowDeposit(false);
                    setDepositAmount('');
                  }}
                  className="px-3 py-2 bg-[var(--gray-100)] text-[var(--gray-600)] rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
              {depositSuiMutation.error && (
                <p className="text-[10px] text-[var(--danger)]">{depositSuiMutation.error.message}</p>
              )}
            </div>
          ) : showWithdraw ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Amount in SUI"
                  step="0.0001"
                  min="0"
                  max={suiBalance / 1_000_000_000}
                  className="flex-1 px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                />
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawSuiMutation.isPending || !withdrawAmount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {withdrawSuiMutation.isPending ? '...' : 'Withdraw'}
                </button>
                <button
                  onClick={() => {
                    setShowWithdraw(false);
                    setWithdrawAmount('');
                  }}
                  className="px-3 py-2 bg-[var(--gray-100)] text-[var(--gray-600)] rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
              <button
                onClick={() => setWithdrawAmount((suiBalance / 1_000_000_000).toString())}
                className="text-[10px] text-[var(--primary)] hover:underline"
              >
                Max: {formatSUI(suiBalance)} SUI
              </button>
              {withdrawSuiMutation.error && (
                <p className="text-[10px] text-[var(--danger)]">{withdrawSuiMutation.error.message}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowDeposit(true)}
                disabled={isLocked}
                className="py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => setShowWithdraw(true)}
                disabled={isLocked || suiBalance === 0}
                className="py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                Withdraw
              </button>
            </div>
          )}

          {/* Lock/Unlock */}
          <div className="pt-3 border-t border-[var(--gray-100)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[var(--gray-700)]">Security Lock</div>
                <div className="text-[10px] text-[var(--gray-500)]">
                  {isLocked ? 'Wallet is locked - no transactions allowed' : 'Wallet is active'}
                </div>
              </div>
              {isLocked ? (
                <button
                  onClick={handleUnlock}
                  disabled={unlockWalletMutation.isPending}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {unlockWalletMutation.isPending ? 'Unlocking...' : 'Unlock'}
                </button>
              ) : (
                <button
                  onClick={handleLock}
                  disabled={lockWalletMutation.isPending}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {lockWalletMutation.isPending ? 'Locking...' : 'Lock'}
                </button>
              )}
            </div>
          </div>

          {/* Wallet Address */}
          <div className="pt-3 border-t border-[var(--gray-100)]">
            <div className="text-[10px] text-[var(--gray-500)] mb-1">Wallet Address</div>
            <div className="text-[10px] font-mono text-[var(--gray-600)] bg-[var(--gray-50)] p-2 rounded break-all">
              {wallet.id}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 pt-3 border-t border-[var(--gray-100)]">
        <details className="text-[10px] text-[var(--gray-500)]">
          <summary className="cursor-pointer hover:text-[var(--gray-700)]">What is a proxy wallet?</summary>
          <div className="mt-2 space-y-1.5 pl-2">
            <p>A proxy wallet is a smart contract wallet that enables:</p>
            <p>- Gasless transactions (relayers pay gas)</p>
            <p>- Operator delegation for automated trading</p>
            <p>- Security controls like locking</p>
            <p>- Centralized token management</p>
          </div>
        </details>
      </div>
    </div>
  );
}
