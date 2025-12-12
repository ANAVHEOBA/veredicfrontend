"use client";

import Image from "next/image";
import Link from "next/link";
import { Market } from "@/types/market";
import { useMarketTradingInfo, useLiquidityPool } from "@/lib/hooks/useTrading";

interface MarketCardProps {
  market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
  const { id, title, image, outcomes, volume, isLive, liveLabel, eventTime, marketId } = market;

  // Fetch live pool price
  const { poolId } = useMarketTradingInfo(marketId);
  const { data: pool } = useLiquidityPool(poolId || undefined);

  // Use live prices from pool if available
  const yesPrice = pool ? Math.round(pool.yesPricePercent) : (outcomes[0]?.price || 50);
  const noPrice = pool ? Math.round(pool.noPricePercent) : (outcomes[1]?.price || 50);

  // Apply live prices to outcomes
  const outcomesWithPrice = outcomes.map((outcome, index) => ({
    ...outcome,
    price: index === 0 ? yesPrice : (index === 1 ? noPrice : outcome.price),
  }));

  return (
    <Link href={`/market/${id}`}>
      <div className="card p-3 md:p-4 cursor-pointer hover:border-[var(--gray-300)] h-full flex flex-col">
        {/* Header with image and title */}
        <div className="flex gap-2.5 md:gap-3 mb-3 md:mb-4">
          {image ? (
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg overflow-hidden shrink-0 bg-[var(--gray-100)]">
              <Image
                src={image}
                alt={title}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg shrink-0 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
            </div>
          )}
          <h3 className="text-xs md:text-sm font-semibold text-[var(--foreground)] line-clamp-2 flex-1 leading-snug">
            {title}
          </h3>
        </div>

        {/* Outcomes List */}
        <div className="flex-1 space-y-1.5 md:space-y-2 mb-2.5 md:mb-3">
          {outcomesWithPrice.slice(0, 3).map((outcome) => (
            <div key={outcome.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {outcome.image && (
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden shrink-0 bg-[var(--gray-100)]">
                    <Image
                      src={outcome.image}
                      alt={outcome.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span className="text-xs md:text-sm text-[var(--gray-700)] truncate">{outcome.name}</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <span className="text-xs md:text-sm font-semibold text-[var(--foreground)] w-9 md:w-10 text-right">
                  {outcome.price}%
                </span>
                <button
                  className="px-2 md:px-2.5 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-semibold bg-[var(--yes-green-bg)] text-[var(--yes-green)] hover:bg-[var(--yes-green)] hover:text-white transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Yes
                </button>
                <button
                  className="px-2 md:px-2.5 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-semibold bg-[var(--no-red-bg)] text-[var(--no-red)] hover:bg-[var(--no-red)] hover:text-white transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] md:text-xs text-[var(--gray-500)] pt-2 border-t border-[var(--gray-100)]">
          <div className="flex items-center gap-1.5 md:gap-2">
            <span>{volume} Vol.</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[14px] md:h-[14px]">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[var(--yes-green)] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[var(--yes-green)] rounded-full animate-pulse" />
                {liveLabel || "LIVE"}
              </span>
              {eventTime && <span>{eventTime}</span>}
            </div>
          )}
          <button onClick={(e) => e.preventDefault()} className="hover:text-[var(--gray-700)] p-1 -m-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-4 md:h-4">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
}
