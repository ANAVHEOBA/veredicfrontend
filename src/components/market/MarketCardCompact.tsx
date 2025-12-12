"use client";

import Image from "next/image";
import Link from "next/link";
import { Market } from "@/types/market";

interface MarketCardCompactProps {
  market: Market;
}

export default function MarketCardCompact({ market }: MarketCardCompactProps) {
  const { id, title, image, outcomes, volume } = market;
  const yesPrice = outcomes[0]?.price || 50;

  return (
    <Link href={`/market/${id}`}>
      <div className="card p-3 cursor-pointer hover:border-[var(--gray-300)] group flex items-center gap-3">
        {/* Image */}
        {image ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[var(--gray-100)]">
            <Image
              src={image}
              alt={title}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg shrink-0 bg-[var(--gray-200)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
            {title}
          </h3>
          <span className="text-xs text-[var(--gray-500)]">{volume} Vol.</span>
        </div>

        {/* Price & Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-[var(--foreground)]">{yesPrice}%</span>
          <button
            className="py-1.5 px-3 rounded-md text-xs font-semibold bg-[var(--yes-green)] text-white hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            Yes
          </button>
          <button
            className="py-1.5 px-3 rounded-md text-xs font-semibold bg-[var(--no-red)] text-white hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            No
          </button>
        </div>
      </div>
    </Link>
  );
}
