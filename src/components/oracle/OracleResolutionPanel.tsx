'use client';

import { useState } from 'react';
import {
  useMarketOracleData,
  useRequestResolution,
  useProposeOutcome,
  useDisputeOutcome,
  useFinalizeUndisputed,
} from '@/lib/hooks/useOracle';
import { useAuth } from '@/providers/AuthProvider';
import { ORACLE_CONSTANTS, REQUEST_STATUS_COLORS, REQUEST_STATUS_NAMES, OUTCOME_NAMES } from '@/types/oracle';

interface OracleResolutionPanelProps {
  marketId: string;
  marketIdNum: number;
  marketStatus: string;
  onConnect: () => void;
}

function formatSUI(mist: number): string {
  const sui = mist / 1_000_000_000;
  if (sui >= 1) return `${sui.toFixed(4)} SUI`;
  return `${sui.toFixed(6)} SUI`;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function StatusBadge({ status }: { status: number }) {
  const colors = REQUEST_STATUS_COLORS[status] || REQUEST_STATUS_COLORS[0];
  const name = REQUEST_STATUS_NAMES[status] || 'Unknown';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
      {name}
    </span>
  );
}

export default function OracleResolutionPanel({
  marketId,
  marketIdNum,
  marketStatus,
  onConnect,
}: OracleResolutionPanelProps) {
  const { user } = useAuth();
  const isConnected = !!user?.address;

  const {
    registry,
    request,
    isLoading,
    hasActiveRequest,
    canRequestResolution,
    defaultBond,
    defaultBondFormatted,
  } = useMarketOracleData(marketIdNum);

  const requestResolutionMutation = useRequestResolution();
  const proposeOutcomeMutation = useProposeOutcome();
  const disputeOutcomeMutation = useDisputeOutcome();
  const finalizeUndisputedMutation = useFinalizeUndisputed();

  const [selectedOutcome, setSelectedOutcome] = useState<number>(ORACLE_CONSTANTS.OUTCOME_YES);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Only show for trading_ended markets or markets with oracle resolution
  if (marketStatus !== 'trading_ended') {
    return null;
  }

  const handleRequestResolution = async () => {
    if (!registry?.id) return;
    try {
      await requestResolutionMutation.mutateAsync({
        oracleRegistryId: registry.id,
        marketId,
        bondAmount: defaultBond,
      });
      setShowRequestForm(false);
    } catch (error) {
      console.error('Failed to request resolution:', error);
    }
  };

  const handleProposeOutcome = async () => {
    if (!registry?.id || !request?.id) return;
    try {
      await proposeOutcomeMutation.mutateAsync({
        oracleRegistryId: registry.id,
        requestId: request.id,
        proposedOutcome: selectedOutcome,
        bondAmount: defaultBond,
      });
    } catch (error) {
      console.error('Failed to propose outcome:', error);
    }
  };

  const handleDispute = async () => {
    if (!registry?.id || !request?.id) return;
    try {
      await disputeOutcomeMutation.mutateAsync({
        oracleRegistryId: registry.id,
        requestId: request.id,
        bondAmount: defaultBond,
      });
    } catch (error) {
      console.error('Failed to dispute outcome:', error);
    }
  };

  const handleFinalize = async () => {
    if (!registry?.id || !request?.id) return;
    try {
      await finalizeUndisputedMutation.mutateAsync({
        oracleRegistryId: registry.id,
        requestId: request.id,
        marketId,
      });
    } catch (error) {
      console.error('Failed to finalize resolution:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-3 md:p-5 animate-pulse">
        <div className="h-5 bg-[var(--gray-200)] rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-[var(--gray-100)] rounded" />
          <div className="h-10 bg-[var(--gray-100)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3 md:p-5">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)]">
          Oracle Resolution
        </h3>
        {request && <StatusBadge status={request.status} />}
      </div>

      {/* No Active Request - Show Request Button */}
      {!hasActiveRequest && canRequestResolution && (
        <div>
          {showRequestForm ? (
            <div className="space-y-3">
              <div className="p-3 bg-[var(--gray-50)] rounded-lg">
                <div className="text-xs text-[var(--gray-500)] mb-1">Required Bond</div>
                <div className="text-base font-semibold text-[var(--foreground)]">
                  {defaultBondFormatted}
                </div>
                <p className="text-[10px] text-[var(--gray-400)] mt-1">
                  Bond is returned if your request is valid
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRequestResolution}
                  disabled={!isConnected || requestResolutionMutation.isPending}
                  className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg text-xs md:text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
                >
                  {requestResolutionMutation.isPending ? 'Requesting...' : 'Request Resolution'}
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 bg-[var(--gray-100)] text-[var(--gray-600)] rounded-lg text-xs md:text-sm"
                >
                  Cancel
                </button>
              </div>
              {requestResolutionMutation.error && (
                <p className="text-[10px] text-[var(--danger)]">
                  {requestResolutionMutation.error.message}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-yellow-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <p className="text-sm text-[var(--gray-600)] mb-3">
                Trading has ended. Request oracle resolution to determine the outcome.
              </p>
              {isConnected ? (
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Request Resolution
                </button>
              ) : (
                <button
                  onClick={onConnect}
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Connect to Request
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Request - Pending (can propose) */}
      {request?.isPending && (
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <div className="text-xs text-yellow-700 font-medium mb-2">Awaiting Proposal</div>
            <p className="text-[10px] text-yellow-600">
              Anyone can propose an outcome with a bond of {defaultBondFormatted}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--gray-700)]">Proposed Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedOutcome(ORACLE_CONSTANTS.OUTCOME_YES)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedOutcome === ORACLE_CONSTANTS.OUTCOME_YES
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                YES
              </button>
              <button
                onClick={() => setSelectedOutcome(ORACLE_CONSTANTS.OUTCOME_NO)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedOutcome === ORACLE_CONSTANTS.OUTCOME_NO
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                NO
              </button>
            </div>
          </div>

          {isConnected ? (
            <button
              onClick={handleProposeOutcome}
              disabled={proposeOutcomeMutation.isPending}
              className="w-full py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
            >
              {proposeOutcomeMutation.isPending ? 'Proposing...' : `Propose ${OUTCOME_NAMES[selectedOutcome]} (${defaultBondFormatted})`}
            </button>
          ) : (
            <button onClick={onConnect} className="w-full py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium">
              Connect to Propose
            </button>
          )}

          {proposeOutcomeMutation.error && (
            <p className="text-[10px] text-[var(--danger)]">{proposeOutcomeMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Active Request - Proposed (can dispute or finalize) */}
      {request?.isProposed && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-700 font-medium">Proposed Outcome</span>
              <span className={`text-sm font-bold ${request.proposedOutcome === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {request.proposedOutcomeName}
              </span>
            </div>
            <div className="text-[10px] text-blue-600">
              Proposed by {request.proposer.slice(0, 6)}...{request.proposer.slice(-4)}
            </div>
            {request.timeUntilDisputeDeadline !== null && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-500">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {formatTimeRemaining(request.timeUntilDisputeDeadline)}
              </div>
            )}
          </div>

          {request.canDispute && (
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--gray-500)]">
                Disagree? Dispute this proposal with a bond of {defaultBondFormatted}
              </p>
              {isConnected ? (
                <button
                  onClick={handleDispute}
                  disabled={disputeOutcomeMutation.isPending || request.proposer === user?.address}
                  className="w-full py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {disputeOutcomeMutation.isPending ? 'Disputing...' : 'Dispute Proposal'}
                </button>
              ) : (
                <button onClick={onConnect} className="w-full py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium">
                  Connect to Dispute
                </button>
              )}
            </div>
          )}

          {request.canFinalize && (
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--gray-500)]">
                Dispute window has passed. Anyone can finalize the resolution.
              </p>
              {isConnected ? (
                <button
                  onClick={handleFinalize}
                  disabled={finalizeUndisputedMutation.isPending}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {finalizeUndisputedMutation.isPending ? 'Finalizing...' : 'Finalize Resolution'}
                </button>
              ) : (
                <button onClick={onConnect} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
                  Connect to Finalize
                </button>
              )}
            </div>
          )}

          {(disputeOutcomeMutation.error || finalizeUndisputedMutation.error) && (
            <p className="text-[10px] text-[var(--danger)]">
              {disputeOutcomeMutation.error?.message || finalizeUndisputedMutation.error?.message}
            </p>
          )}
        </div>
      )}

      {/* Active Request - Disputed (awaiting admin) */}
      {request?.isDisputed && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span className="text-sm text-red-700 font-medium">Disputed</span>
          </div>
          <p className="text-[10px] text-red-600">
            This proposal has been disputed. An admin will review and make the final decision.
          </p>
          <div className="mt-2 text-[10px] text-red-500">
            Disputed by {request.disputer.slice(0, 6)}...{request.disputer.slice(-4)}
          </div>
        </div>
      )}

      {/* Active Request - Finalized */}
      {request?.isFinalized && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-700 font-medium mb-1">Final Outcome</div>
              <div className={`text-xl font-bold ${request.finalOutcome === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {request.finalOutcomeName}
              </div>
            </div>
            <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          {request.resolvedTime && (
            <div className="mt-2 text-[10px] text-green-500">
              Resolved on {request.resolvedTime.toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-4 pt-3 border-t border-[var(--gray-100)]">
        <details className="text-[10px] text-[var(--gray-500)]">
          <summary className="cursor-pointer hover:text-[var(--gray-700)]">How does oracle resolution work?</summary>
          <div className="mt-2 space-y-1.5 pl-2">
            <p>1. Anyone can request resolution by posting a bond</p>
            <p>2. Proposers suggest an outcome (YES/NO) with a bond</p>
            <p>3. Others can dispute during the dispute window (2 hours)</p>
            <p>4. If undisputed, the proposal is finalized automatically</p>
            <p>5. If disputed, an admin makes the final decision</p>
          </div>
        </details>
      </div>
    </div>
  );
}
