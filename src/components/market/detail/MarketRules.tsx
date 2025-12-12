"use client";

import { useState } from "react";

interface MarketRulesProps {
  rules: string;
  resolutionSource?: string;
  onGenerateContext?: () => void;
}

export default function MarketRules({
  rules,
  resolutionSource,
  onGenerateContext,
}: MarketRulesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Truncate rules if too long
  const maxLength = 200;
  const shouldTruncate = rules.length > maxLength;
  const displayRules = isExpanded ? rules : rules.slice(0, maxLength) + (shouldTruncate ? "..." : "");

  return (
    <div className="card p-3 md:p-5">
      {/* Market Context Button */}
      {onGenerateContext && (
        <div className="flex items-center justify-between p-2 md:p-3 bg-[var(--gray-50)] rounded-lg mb-3 md:mb-4">
          <span className="text-xs md:text-sm font-medium text-[var(--foreground)]">
            Market Context
          </span>
          <button
            onClick={onGenerateContext}
            className="text-xs md:text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            Generate
          </button>
        </div>
      )}

      {/* Rules Section */}
      <div>
        <h3 className="text-sm md:text-base font-semibold text-[var(--foreground)] mb-2 md:mb-3">
          Rules
        </h3>

        <p className="text-xs md:text-sm text-[var(--gray-600)] leading-relaxed whitespace-pre-wrap">
          {displayRules}
        </p>

        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 mt-2 md:mt-3 text-xs md:text-sm font-medium text-[var(--gray-600)] hover:text-[var(--foreground)] transition-colors"
          >
            <span>{isExpanded ? "Show less" : "Show more"}</span>
            <svg
              className="w-3.5 h-3.5 md:w-4 md:h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {/* Resolution Source */}
        {resolutionSource && (
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[var(--gray-100)]">
            <span className="text-[10px] md:text-xs text-[var(--gray-500)]">Resolution Source:</span>
            <p className="text-xs md:text-sm text-[var(--gray-700)] mt-1">{resolutionSource}</p>
          </div>
        )}
      </div>
    </div>
  );
}
