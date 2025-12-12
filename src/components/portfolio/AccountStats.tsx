'use client';

import { useState } from 'react';
import {
  useUserFeeStats,
  useFeeRegistry,
  useCreateUserStats,
  useReferralConfig,
  useReferralRegistry,
  useCreateReferralCode,
  useCreatorFeeConfig,
  useCreateCreatorConfig,
} from '@/lib/hooks/useFees';
import { TIER_NAMES, TIER_COLORS, FEE_CONSTANTS } from '@/types/fee';

// =============================================================================
// TIER BADGE SUB-COMPONENT
// =============================================================================

function TierBadge({ tier }: { tier: number }) {
  const tierName = TIER_NAMES[tier] || 'Bronze';
  const colors = TIER_COLORS[tier] || TIER_COLORS[FEE_CONSTANTS.TIER_BRONZE];

  return (
    <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
      {tier === FEE_CONSTANTS.TIER_DIAMOND && (
        <svg className="w-2.5 h-2.5 md:w-3 md:h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5L2 9l10 12L22 9l-3-6z" />
        </svg>
      )}
      {tierName}
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AccountStats() {
  const { data: registry } = useFeeRegistry();
  const { data: userStats, isLoading: statsLoading } = useUserFeeStats();
  const { data: referralConfig, isLoading: referralLoading } = useReferralConfig();
  const { data: creatorConfig, isLoading: creatorLoading } = useCreatorFeeConfig();
  const { data: referralRegistryId } = useReferralRegistry();

  const createStatsMutation = useCreateUserStats();
  const createReferralMutation = useCreateReferralCode();
  const createCreatorMutation = useCreateCreatorConfig();

  const [showReferralSetup, setShowReferralSetup] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isLoading = statsLoading || referralLoading || creatorLoading;

  // Calculate totals
  const totalEarnings = (referralConfig?.earnings || 0) + (creatorConfig?.earnings || 0);
  const totalEarnedAllTime = (referralConfig?.totalEarned || 0) + (creatorConfig?.totalEarned || 0);

  const handleCopyReferralCode = () => {
    if (!referralConfig) return;
    navigator.clipboard.writeText(referralConfig.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateReferralCode = async () => {
    if (!referralRegistryId || !newReferralCode.trim()) return;
    try {
      await createReferralMutation.mutateAsync({
        referralRegistryId,
        code: newReferralCode.trim().toUpperCase(),
      });
      setNewReferralCode('');
      setShowReferralSetup(false);
    } catch (err) {
      console.error('Failed to create referral code:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-3 md:p-4 animate-pulse">
        <div className="h-5 md:h-6 bg-[var(--gray-200)] rounded w-1/3 mb-3 md:mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 md:h-16 bg-[var(--gray-100)] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3 md:p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-base md:text-lg font-semibold text-[var(--foreground)]">Account Stats</h2>
        {userStats && <TierBadge tier={userStats.currentTier} />}
      </div>

      {/* Initialize Stats if needed */}
      {!userStats && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-blue-800">Enable Fee Tracking</p>
              <p className="text-[10px] md:text-xs text-blue-600">Track your volume to unlock lower fees</p>
            </div>
            <button
              onClick={() => createStatsMutation.mutate()}
              disabled={createStatsMutation.isPending}
              className="shrink-0 px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white text-xs md:text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createStatsMutation.isPending ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
        {/* Trading Volume */}
        <div className="p-2 md:p-3 bg-[var(--gray-50)] rounded-lg">
          <div className="text-[10px] md:text-xs text-[var(--gray-500)] mb-0.5 md:mb-1">30d Volume</div>
          <div className="text-base md:text-lg font-semibold text-[var(--foreground)]">
            {userStats?.volume30dFormatted || '0'}
          </div>
          <div className="text-[10px] md:text-xs text-[var(--gray-400)]">SUI</div>
        </div>

        {/* Fee Rate */}
        <div className="p-2 md:p-3 bg-[var(--gray-50)] rounded-lg">
          <div className="text-[10px] md:text-xs text-[var(--gray-500)] mb-0.5 md:mb-1">Your Fee Rate</div>
          <div className="text-base md:text-lg font-semibold text-[var(--primary)]">
            {userStats?.effectiveFeePercent?.toFixed(2) || registry?.baseFeePercent?.toFixed(2) || '1.00'}%
          </div>
          {userStats && registry && userStats.effectiveFeePercent < registry.baseFeePercent && (
            <div className="text-[10px] md:text-xs text-[var(--yes-green)]">
              -{(registry.baseFeePercent - userStats.effectiveFeePercent).toFixed(2)}% saved
            </div>
          )}
        </div>

        {/* Pending Earnings */}
        <div className="p-2 md:p-3 bg-green-50 rounded-lg">
          <div className="text-[10px] md:text-xs text-[var(--gray-500)] mb-0.5 md:mb-1">Pending Earnings</div>
          <div className="text-base md:text-lg font-semibold text-[var(--yes-green)]">
            {formatSUI(totalEarnings)}
          </div>
          <div className="text-[10px] md:text-xs text-[var(--gray-400)]">SUI</div>
        </div>

        {/* Total Earned */}
        <div className="p-2 md:p-3 bg-[var(--gray-50)] rounded-lg">
          <div className="text-[10px] md:text-xs text-[var(--gray-500)] mb-0.5 md:mb-1">Total Earned</div>
          <div className="text-base md:text-lg font-semibold text-[var(--foreground)]">
            {formatSUI(totalEarnedAllTime)}
          </div>
          <div className="text-[10px] md:text-xs text-[var(--gray-400)]">SUI (all time)</div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      {userStats?.nextTier && (
        <div className="mb-3 md:mb-4 p-2 md:p-3 bg-[var(--gray-50)] rounded-lg">
          <div className="flex items-center justify-between text-[10px] md:text-xs mb-1.5 md:mb-2">
            <span className="text-[var(--gray-600)]">
              Progress to <span className="font-medium">{userStats.nextTier.name}</span>
            </span>
            <span className="text-[var(--gray-500)]">
              {userStats.volumeToNextTierFormatted} SUI to go
            </span>
          </div>
          <div className="h-1.5 md:h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] rounded-full transition-all"
              style={{
                width: `${Math.min(100, (userStats.volume30d / userStats.nextTier.minVolume) * 100)}%`,
              }}
            />
          </div>
          <div className="text-[10px] md:text-xs text-[var(--gray-500)] mt-1">
            Next tier: {userStats.nextTier.feePercent.toFixed(2)}% fee rate
          </div>
        </div>
      )}

      {/* Referral Section */}
      <div className="pt-3 md:pt-4 border-t border-[var(--gray-100)]">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <h3 className="text-xs md:text-sm font-medium text-[var(--foreground)]">Referral Program</h3>
          {referralConfig && (
            <span className="text-[10px] md:text-xs text-[var(--gray-500)]">
              {referralConfig.referredCount} referrals
            </span>
          )}
        </div>

        {referralConfig ? (
          // Has referral code
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 p-2 md:p-3 bg-blue-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] md:text-xs text-[var(--gray-500)] mb-0.5">Your Code</div>
              <div className="text-base md:text-lg font-bold tracking-wider text-blue-700">
                {referralConfig.referralCode}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReferralCode}
                className="px-2.5 md:px-3 py-1.5 md:py-2 bg-white border border-blue-200 rounded-lg text-xs md:text-sm text-blue-700 hover:bg-blue-50"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {referralConfig.earnings > 0 && (
                <div className="text-right">
                  <div className="text-[10px] md:text-xs text-[var(--gray-500)]">Pending</div>
                  <div className="text-xs md:text-sm font-semibold text-[var(--yes-green)]">
                    {referralConfig.earningsFormatted} SUI
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : showReferralSetup ? (
          // Creating referral code
          <div className="space-y-2 md:space-y-3">
            <input
              type="text"
              value={newReferralCode}
              onChange={(e) => setNewReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="Choose your code (e.g., TRADER123)"
              maxLength={FEE_CONSTANTS.MAX_REFERRAL_CODE_LENGTH}
              className="w-full px-2.5 md:px-3 py-1.5 md:py-2 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-lg text-xs md:text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateReferralCode}
                disabled={createReferralMutation.isPending || newReferralCode.length < FEE_CONSTANTS.MIN_REFERRAL_CODE_LENGTH}
                className="flex-1 py-1.5 md:py-2 bg-[var(--primary)] text-white rounded-lg text-xs md:text-sm font-medium disabled:opacity-50"
              >
                {createReferralMutation.isPending ? 'Creating...' : 'Create Code'}
              </button>
              <button
                onClick={() => setShowReferralSetup(false)}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-[var(--gray-100)] text-[var(--gray-600)] rounded-lg text-xs md:text-sm"
              >
                Cancel
              </button>
            </div>
            {createReferralMutation.error && (
              <p className="text-[10px] md:text-xs text-[var(--danger)]">{createReferralMutation.error.message}</p>
            )}
          </div>
        ) : (
          // No referral code yet
          <button
            onClick={() => setShowReferralSetup(true)}
            className="w-full py-2 md:py-2.5 bg-[var(--gray-100)] text-[var(--gray-700)] rounded-lg text-xs md:text-sm font-medium hover:bg-[var(--gray-200)] transition-colors"
          >
            Create Referral Code
          </button>
        )}
      </div>

      {/* Creator Section */}
      {creatorConfig ? (
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[var(--gray-100)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs md:text-sm font-medium text-[var(--foreground)]">Creator Earnings</h3>
              <p className="text-[10px] md:text-xs text-[var(--gray-500)]">
                {creatorConfig.marketCount} markets created
              </p>
            </div>
            <div className="text-right">
              <div className="text-base md:text-lg font-semibold text-purple-600">
                {creatorConfig.earningsFormatted} SUI
              </div>
              <div className="text-[10px] md:text-xs text-[var(--gray-500)]">pending</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[var(--gray-100)]">
          <button
            onClick={() => createCreatorMutation.mutate()}
            disabled={createCreatorMutation.isPending}
            className="w-full py-1.5 md:py-2 text-xs md:text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)]"
          >
            {createCreatorMutation.isPending ? 'Setting up...' : 'Setup Creator Profile'}
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER
// =============================================================================

function formatSUI(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (sui >= 1_000_000) return `${(sui / 1_000_000).toFixed(2)}M`;
  if (sui >= 1_000) return `${(sui / 1_000).toFixed(2)}K`;
  if (sui >= 1) return sui.toFixed(4);
  if (sui >= 0.0001) return sui.toFixed(6);
  return '0';
}
