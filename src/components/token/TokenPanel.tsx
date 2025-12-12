'use client';

import { useState } from 'react';
import {
  useMintTokens,
  useMergeTokenSet,
  useVaultForMarket,
  useCreateVault,
  useInvalidateTokens,
  useConsolidateAllTokens,
  useSplitToken
} from '@/lib/hooks/useTokens';
import type { MarketPosition } from '@/types/token';

interface TokenPanelProps {
  marketId: string;
  marketStatus: string;
  isConnected: boolean;
  position?: MarketPosition | null;
  onConnect: () => void;
}

type TabType = 'mint' | 'merge' | 'manage';

export default function TokenPanel({
  marketId,
  marketStatus,
  isConnected,
  position,
  onConnect,
}: TokenPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('mint');
  const [amount, setAmount] = useState('');
  const [splitAmount, setSplitAmount] = useState('');
  const [selectedTokenType, setSelectedTokenType] = useState<'yes' | 'no'>('yes');
  const [error, setError] = useState<string | null>(null);

  // Get vault for this market
  const { data: vaultId, isLoading: isLoadingVault, refetch: refetchVault } = useVaultForMarket(marketId);

  // Mutations
  const createVaultMutation = useCreateVault();
  const mintMutation = useMintTokens();
  const mergeMutation = useMergeTokenSet();
  const { invalidateAll } = useInvalidateTokens();
  const { consolidateAll, isPending: isConsolidating } = useConsolidateAllTokens();
  const splitMutation = useSplitToken();

  const isMarketOpen = marketStatus === 'open';

  // Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
  const amountInMist = Math.floor(parseFloat(amount || '0') * 1_000_000_000);

  // Calculate max mergeable amount (min of YES and NO balances)
  const maxMergeable = position
    ? Math.min(position.totalYesBalance, position.totalNoBalance)
    : 0;
  const maxMergeableSui = maxMergeable / 1_000_000_000;

  const handleMint = async () => {
    if (amountInMist <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError(null);

    try {
      let currentVaultId = vaultId;

      // If no vault exists, create one first
      if (!currentVaultId) {
        console.log('Creating vault for market:', marketId);
        const createResult = await createVaultMutation.mutateAsync(marketId);
        console.log('Create vault mutation result:', createResult);

        if (!createResult.success || !createResult.data?.vaultId) {
          console.error('Vault creation failed:', createResult);
          setError('Failed to create vault');
          return;
        }
        currentVaultId = createResult.data.vaultId;
        console.log('Vault created with ID:', currentVaultId);

        // Refetch vault info
        await refetchVault();
        invalidateAll();
      }

      console.log('Minting tokens with vault:', currentVaultId);
      // Now mint tokens
      await mintMutation.mutateAsync({
        marketId,
        vaultId: currentVaultId,
        amount: amountInMist,
      });
      setAmount('');
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.message || 'Failed to mint tokens');
    }
  };

  const handleMerge = async () => {
    if (!vaultId || !position) {
      setError('No vault or position found');
      return;
    }

    if (amountInMist <= 0 || amountInMist > maxMergeable) {
      setError('Invalid merge amount');
      return;
    }

    // Find tokens to merge
    const yesToken = position.yesTokens[0];
    const noToken = position.noTokens[0];

    if (!yesToken || !noToken) {
      setError('No tokens available to merge');
      return;
    }

    setError(null);

    try {
      await mergeMutation.mutateAsync({
        marketId,
        vaultId,
        yesTokenId: yesToken.id,
        noTokenId: noToken.id,
        amount: amountInMist,
      });
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to merge tokens');
    }
  };

  const handleConsolidate = async () => {
    if (!position) {
      setError('No position found');
      return;
    }

    setError(null);

    try {
      await consolidateAll(position.yesTokens, position.noTokens);
    } catch (err: any) {
      setError(err.message || 'Failed to consolidate tokens');
    }
  };

  const handleSplit = async () => {
    const splitAmountInMist = Math.floor(parseFloat(splitAmount || '0') * 1_000_000_000);

    if (splitAmountInMist <= 0) {
      setError('Please enter a valid amount to split');
      return;
    }

    const tokens = selectedTokenType === 'yes' ? position?.yesTokens : position?.noTokens;
    if (!tokens || tokens.length === 0) {
      setError(`No ${selectedTokenType.toUpperCase()} tokens to split`);
      return;
    }

    const token = tokens[0];
    if (splitAmountInMist >= token.balance) {
      setError('Split amount must be less than total balance');
      return;
    }

    setError(null);

    try {
      await splitMutation.mutateAsync({
        tokenId: token.id,
        amount: splitAmountInMist,
        tokenType: selectedTokenType,
      });
      setSplitAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to split token');
    }
  };

  const isPending = createVaultMutation.isPending || mintMutation.isPending || mergeMutation.isPending || isConsolidating || splitMutation.isPending;

  if (!isMarketOpen) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-[var(--foreground)] mb-3">Tokens</h3>
        <p className="text-sm text-[var(--gray-500)]">
          Token minting is only available while the market is open.
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-[var(--foreground)] mb-3">Mint Tokens</h3>
        <p className="text-sm text-[var(--gray-500)] mb-4">
          Connect your wallet to mint YES and NO tokens.
        </p>
        <button
          onClick={onConnect}
          className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-lg mb-4">
        <button
          onClick={() => setActiveTab('mint')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'mint'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
          }`}
        >
          Mint
        </button>
        <button
          onClick={() => setActiveTab('merge')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'merge'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
          }`}
        >
          Merge
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'manage'
              ? 'bg-white text-[var(--foreground)] shadow-sm'
              : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
          }`}
        >
          Manage
        </button>
      </div>

      {/* Content */}
      {activeTab === 'mint' && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-[var(--gray-700)]">
                Amount (SUI)
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 pr-16 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--gray-500)]">
                SUI
              </span>
            </div>
          </div>

          {/* Preview */}
          {parseFloat(amount) > 0 && (
            <div className="p-3 bg-[var(--gray-50)] rounded-lg">
              <div className="text-xs text-[var(--gray-500)] mb-2">You will receive:</div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">{amount} YES</span>
                <span className="text-red-600 font-medium">{amount} NO</span>
              </div>
            </div>
          )}

          {isLoadingVault && (
            <p className="text-xs text-[var(--gray-500)]">Loading vault...</p>
          )}

          {!vaultId && !isLoadingVault && (
            <p className="text-xs text-[var(--warning)]">
              No vault found. First mint will create one.
            </p>
          )}

          {/* Submit Button */}
          <button
            onClick={handleMint}
            disabled={isPending || !amount || parseFloat(amount) <= 0}
            className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? createVaultMutation.isPending
                ? 'Creating Vault...'
                : 'Minting...'
              : vaultId
              ? 'Mint Tokens'
              : 'Create Vault & Mint'}
          </button>

          <p className="text-xs text-[var(--gray-500)] text-center">
            1 SUI = 1 YES + 1 NO token
          </p>
        </div>
      )}

      {activeTab === 'merge' && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-[var(--gray-700)]">
                Amount to Merge
              </label>
              {maxMergeable > 0 && (
                <button
                  onClick={() => setAmount(maxMergeableSui.toString())}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Max: {maxMergeableSui.toFixed(4)} SUI
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                max={maxMergeableSui}
                step="0.01"
                className="w-full px-3 py-2.5 pr-16 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--gray-500)]">
                SUI
              </span>
            </div>
          </div>

          {/* Preview */}
          {parseFloat(amount) > 0 && (
            <div className="p-3 bg-[var(--gray-50)] rounded-lg">
              <div className="text-xs text-[var(--gray-500)] mb-2">You will burn:</div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-600">{amount} YES</span>
                <span className="text-red-600">{amount} NO</span>
              </div>
              <div className="text-xs text-[var(--gray-500)] mb-1">You will receive:</div>
              <div className="text-sm font-medium text-[var(--foreground)]">
                {amount} SUI
              </div>
            </div>
          )}

          {maxMergeable === 0 && (
            <p className="text-xs text-[var(--gray-500)]">
              You need both YES and NO tokens to merge.
            </p>
          )}

          {/* Submit Button */}
          <button
            onClick={handleMerge}
            disabled={isPending || !amount || parseFloat(amount) <= 0 || amountInMist > maxMergeable}
            className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mergeMutation.isPending ? 'Merging...' : 'Merge Tokens'}
          </button>

          <p className="text-xs text-[var(--gray-500)] text-center">
            1 YES + 1 NO = 1 SUI (minus fees)
          </p>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Token Summary */}
          <div className="p-3 bg-[var(--gray-50)] rounded-lg">
            <div className="text-xs text-[var(--gray-500)] mb-2">Your Tokens</div>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-green-600 font-medium">
                  {position?.yesTokens.length || 0} YES
                </span>
                <span className="text-xs text-[var(--gray-400)] ml-1">
                  token{position?.yesTokens.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-red-600 font-medium">
                  {position?.noTokens.length || 0} NO
                </span>
                <span className="text-xs text-[var(--gray-400)] ml-1">
                  token{position?.noTokens.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Consolidate Section */}
          <div className="border-t border-[var(--gray-200)] pt-4">
            <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">Consolidate Tokens</h4>
            <p className="text-xs text-[var(--gray-500)] mb-3">
              Merge multiple tokens of the same type into one for easier management.
            </p>

            {((position?.yesTokens.length || 0) > 1 || (position?.noTokens.length || 0) > 1) ? (
              <button
                onClick={handleConsolidate}
                disabled={isPending}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConsolidating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Consolidating...
                  </>
                ) : (
                  'Consolidate All Tokens'
                )}
              </button>
            ) : (
              <p className="text-xs text-[var(--gray-400)] italic">
                All tokens are already consolidated.
              </p>
            )}
          </div>

          {/* Split Section */}
          <div className="border-t border-[var(--gray-200)] pt-4">
            <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">Split Token</h4>
            <p className="text-xs text-[var(--gray-500)] mb-3">
              Split a token into two for partial transfers or sales.
            </p>

            {/* Token Type Selector */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSelectedTokenType('yes')}
                className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                  selectedTokenType === 'yes'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-[var(--gray-300)] text-[var(--gray-600)] hover:border-green-300'
                }`}
              >
                YES ({((position?.totalYesBalance || 0) / 1_000_000_000).toFixed(4)})
              </button>
              <button
                onClick={() => setSelectedTokenType('no')}
                className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                  selectedTokenType === 'no'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-[var(--gray-300)] text-[var(--gray-600)] hover:border-red-300'
                }`}
              >
                NO ({((position?.totalNoBalance || 0) / 1_000_000_000).toFixed(4)})
              </button>
            </div>

            {/* Split Amount Input */}
            <div className="relative mb-3">
              <input
                type="number"
                value={splitAmount}
                onChange={(e) => setSplitAmount(e.target.value)}
                placeholder="Amount to split off"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 pr-16 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--gray-500)]">
                {selectedTokenType.toUpperCase()}
              </span>
            </div>

            <button
              onClick={handleSplit}
              disabled={
                isPending ||
                !splitAmount ||
                parseFloat(splitAmount) <= 0 ||
                (selectedTokenType === 'yes' && (position?.yesTokens.length || 0) === 0) ||
                (selectedTokenType === 'no' && (position?.noTokens.length || 0) === 0)
              }
              className="w-full py-2.5 bg-[var(--gray-600)] text-white rounded-lg font-medium hover:bg-[var(--gray-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {splitMutation.isPending ? 'Splitting...' : 'Split Token'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-[var(--danger)]">{error}</p>
        </div>
      )}
    </div>
  );
}
