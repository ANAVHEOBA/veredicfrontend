'use client';

import { useState } from 'react';
import {
  useCreatorFeeConfig,
  useReferralConfig,
  useClaimCreatorEarnings,
  useClaimReferralEarnings,
} from '@/lib/hooks/useFees';

function formatSUI(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (sui >= 1_000_000) return `${(sui / 1_000_000).toFixed(2)}M`;
  if (sui >= 1_000) return `${(sui / 1_000).toFixed(2)}K`;
  if (sui >= 1) return sui.toFixed(4);
  if (sui >= 0.0001) return sui.toFixed(6);
  return '0';
}

export default function ClaimEarnings() {
  const { data: creatorConfig } = useCreatorFeeConfig();
  const { data: referralConfig } = useReferralConfig();

  const claimCreatorMutation = useClaimCreatorEarnings();
  const claimReferralMutation = useClaimReferralEarnings();

  const [showSuccess, setShowSuccess] = useState<'creator' | 'referral' | null>(null);

  const creatorEarnings = creatorConfig?.earnings || 0;
  const referralEarnings = referralConfig?.earnings || 0;
  const totalPending = creatorEarnings + referralEarnings;

  const handleClaimCreator = async () => {
    if (!creatorConfig?.id) return;
    try {
      await claimCreatorMutation.mutateAsync(creatorConfig.id);
      setShowSuccess('creator');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to claim creator earnings:', error);
    }
  };

  const handleClaimReferral = async () => {
    if (!referralConfig?.id) return;
    try {
      await claimReferralMutation.mutateAsync(referralConfig.id);
      setShowSuccess('referral');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to claim referral earnings:', error);
    }
  };

  // Don't show if no earnings to claim
  if (totalPending === 0) {
    return null;
  }

  return (
    <div className="card p-3 md:p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-base md:text-lg font-semibold text-[var(--foreground)]">
          Claim Earnings
        </h2>
        <div className="text-right">
          <div className="text-xs md:text-sm text-[var(--gray-500)]">Total Pending</div>
          <div className="text-lg md:text-xl font-bold text-[var(--yes-green)]">
            {formatSUI(totalPending)} SUI
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-xs md:text-sm text-green-700 font-medium">
              {showSuccess === 'creator' ? 'Creator' : 'Referral'} earnings claimed successfully!
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2 md:space-y-3">
        {/* Creator Earnings */}
        {creatorEarnings > 0 && (
          <div className="flex items-center justify-between p-2.5 md:p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span className="text-xs md:text-sm font-medium text-purple-700">Creator Earnings</span>
              </div>
              <div className="text-base md:text-lg font-bold text-purple-600 mt-0.5">
                {formatSUI(creatorEarnings)} SUI
              </div>
              {creatorConfig?.marketCount && (
                <div className="text-[10px] md:text-xs text-purple-500">
                  From {creatorConfig.marketCount} market{creatorConfig.marketCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <button
              onClick={handleClaimCreator}
              disabled={claimCreatorMutation.isPending}
              className="shrink-0 px-3 md:px-4 py-1.5 md:py-2 bg-purple-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {claimCreatorMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 md:w-4 md:h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Claiming...
                </span>
              ) : (
                'Claim'
              )}
            </button>
          </div>
        )}

        {/* Referral Earnings */}
        {referralEarnings > 0 && (
          <div className="flex items-center justify-between p-2.5 md:p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="text-xs md:text-sm font-medium text-blue-700">Referral Earnings</span>
              </div>
              <div className="text-base md:text-lg font-bold text-blue-600 mt-0.5">
                {formatSUI(referralEarnings)} SUI
              </div>
              {referralConfig?.referredCount !== undefined && referralConfig.referredCount > 0 && (
                <div className="text-[10px] md:text-xs text-blue-500">
                  From {referralConfig.referredCount} referral{referralConfig.referredCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <button
              onClick={handleClaimReferral}
              disabled={claimReferralMutation.isPending}
              className="shrink-0 px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {claimReferralMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 md:w-4 md:h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Claiming...
                </span>
              ) : (
                'Claim'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {claimCreatorMutation.error && (
        <div className="mt-2 md:mt-3 p-2 md:p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-[10px] md:text-xs text-red-600">
            Failed to claim creator earnings: {claimCreatorMutation.error.message}
          </p>
        </div>
      )}
      {claimReferralMutation.error && (
        <div className="mt-2 md:mt-3 p-2 md:p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-[10px] md:text-xs text-red-600">
            Failed to claim referral earnings: {claimReferralMutation.error.message}
          </p>
        </div>
      )}
    </div>
  );
}
