"use client";

import Image from "next/image";
import Link from "next/link";
import { Market } from "@/types/market";
import { useMarketTradingInfo, useLiquidityPool } from "@/lib/hooks/useTrading";

interface SimpleCardProps {
  market: Market;
}

export default function SimpleCard({ market }: SimpleCardProps) {
  const { id, title, image, outcomes, volume, marketId } = market;

  // Fetch live pool price
  const { poolId } = useMarketTradingInfo(marketId);
  const { data: pool } = useLiquidityPool(poolId || undefined);

  // Use live price from pool if available, otherwise fall back to static price
  const yesPrice = pool ? Math.round(pool.yesPricePercent) : (outcomes[0]?.price || 50);
  const noPrice = 100 - yesPrice;

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
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          )}
          <h3 className="text-xs md:text-sm font-semibold text-[var(--foreground)] line-clamp-2 flex-1 leading-snug">
            {title}
          </h3>
        </div>

        {/* Large Percentage Display */}
        <div className="flex items-baseline gap-1 mb-2.5 md:mb-3">
          <span className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">{yesPrice}%</span>
          <span className="text-xs md:text-sm text-[var(--gray-500)]">chance</span>
        </div>

        {/* Yes/No Buttons with prices like Polymarket */}
        <div className="flex gap-2 mb-2.5 md:mb-3">
          <button
            className="flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-lg text-xs md:text-sm font-semibold transition-all bg-[var(--yes-green-bg)] text-[var(--yes-green)] hover:bg-[var(--yes-green)] hover:text-white border border-transparent hover:border-[var(--yes-green)]"
            onClick={(e) => e.preventDefault()}
          >
            Yes {yesPrice}¢
          </button>
          <button
            className="flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-lg text-xs md:text-sm font-semibold transition-all bg-[var(--no-red-bg)] text-[var(--no-red)] hover:bg-[var(--no-red)] hover:text-white border border-transparent hover:border-[var(--no-red)]"
            onClick={(e) => e.preventDefault()}
          >
            No {noPrice}¢
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] md:text-xs text-[var(--gray-500)] pt-2 border-t border-[var(--gray-100)] mt-auto">
          <div className="flex items-center gap-1.5 md:gap-2">
            <span>{volume} Vol.</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[14px] md:h-[14px]">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
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
