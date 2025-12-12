"use client";

import Image from "next/image";
import Link from "next/link";
import { Market } from "@/types/market";
import { useMarketTradingInfo, useLiquidityPool } from "@/lib/hooks/useTrading";

interface VersusCardProps {
  market: Market;
}

export default function VersusCard({ market }: VersusCardProps) {
  const { id, title, outcomes, volume, isLive, liveLabel, eventTime, marketId } = market;

  // Fetch live pool price
  const { poolId } = useMarketTradingInfo(marketId);
  const { data: pool } = useLiquidityPool(poolId || undefined);

  // Use live prices from pool if available
  const yesPrice = pool ? Math.round(pool.yesPricePercent) : (outcomes[0]?.price || 50);
  const noPrice = pool ? Math.round(pool.noPricePercent) : (outcomes[1]?.price || 50);

  // For versus cards, we expect exactly 2 outcomes (or 3 with draw)
  const team1 = { ...outcomes[0], price: yesPrice };
  const team2 = { ...outcomes[1], price: noPrice };
  const draw = outcomes.length > 2 ? outcomes[2] : null;

  return (
    <Link href={`/market/${id}`}>
      <div className="card p-3 md:p-4 cursor-pointer hover:border-[var(--gray-300)] h-full flex flex-col">
        {/* Teams with scores */}
        <div className="space-y-2.5 md:space-y-3 mb-3 md:mb-4">
          {/* Team 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {team1.image ? (
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden shrink-0 bg-[var(--gray-100)]">
                  <Image
                    src={team1.image}
                    alt={team1.name}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--gray-200)] flex items-center justify-center text-[10px] md:text-xs font-bold text-[var(--gray-600)]">
                  {team1.name.charAt(0)}
                </div>
              )}
              <span className="text-xs md:text-sm font-medium text-[var(--foreground)]">{team1.name}</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-[var(--foreground)]">{team1.price}%</span>
          </div>

          {/* Team 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {team2.image ? (
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden shrink-0 bg-[var(--gray-100)]">
                  <Image
                    src={team2.image}
                    alt={team2.name}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--gray-200)] flex items-center justify-center text-[10px] md:text-xs font-bold text-[var(--gray-600)]">
                  {team2.name.charAt(0)}
                </div>
              )}
              <span className="text-xs md:text-sm font-medium text-[var(--foreground)]">{team2.name}</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-[var(--foreground)]">{team2.price}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 md:gap-2 mb-2.5 md:mb-3">
          <button
            className="flex-1 py-1.5 md:py-2 px-2 md:px-3 rounded-lg text-xs md:text-sm font-semibold transition-all bg-[var(--yes-green-bg)] text-[var(--yes-green)] hover:bg-[var(--yes-green)] hover:text-white"
            onClick={(e) => e.preventDefault()}
          >
            {team1.name.split(" ").pop()}
          </button>
          {draw && (
            <button
              className="py-1.5 md:py-2 px-3 md:px-4 rounded-lg text-xs md:text-sm font-semibold transition-all bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]"
              onClick={(e) => e.preventDefault()}
            >
              Draw
            </button>
          )}
          <button
            className="flex-1 py-1.5 md:py-2 px-2 md:px-3 rounded-lg text-xs md:text-sm font-semibold transition-all bg-[var(--no-red-bg)] text-[var(--no-red)] hover:bg-[var(--no-red)] hover:text-white"
            onClick={(e) => e.preventDefault()}
          >
            {team2.name.split(" ").pop()}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] md:text-xs text-[var(--gray-500)] pt-2 border-t border-[var(--gray-100)]">
          <div className="flex items-center gap-1.5 md:gap-2">
            {isLive && (
              <span className="text-[var(--yes-green)] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[var(--yes-green)] rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            <span>{volume} Vol.</span>
            {liveLabel && <span>{liveLabel}</span>}
            {eventTime && <span>{eventTime}</span>}
          </div>
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
