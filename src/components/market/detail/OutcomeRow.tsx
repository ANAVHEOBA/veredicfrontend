"use client";

import Image from "next/image";
import { Outcome } from "@/types/market";

interface OutcomeRowProps {
  outcome: Outcome;
  volume?: string;
  change?: number; // percentage change, e.g., +1 or -2
  onBuyYes?: () => void;
  onBuyNo?: () => void;
}

export default function OutcomeRow({
  outcome,
  volume,
  change,
  onBuyYes,
  onBuyNo,
}: OutcomeRowProps) {
  const { name, price, image } = outcome;

  // Calculate No price (inverse of Yes)
  const yesPrice = price;
  const noPrice = 100 - price;

  return (
    <div className="flex items-center justify-between gap-2 md:gap-3 py-2 md:py-3 border-b border-[var(--gray-100)] last:border-b-0">
      {/* Outcome Info */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {image ? (
          <div className="w-7 h-7 md:w-10 md:h-10 rounded-full overflow-hidden shrink-0 bg-[var(--gray-100)]">
            <Image
              src={image}
              alt={name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-7 h-7 md:w-10 md:h-10 rounded-full shrink-0 bg-[var(--gray-200)] flex items-center justify-center text-xs md:text-sm font-bold text-[var(--gray-600)]">
            {name.charAt(0)}
          </div>
        )}

        <div className="min-w-0">
          <div className="font-medium text-xs md:text-base text-[var(--foreground)] truncate">
            {name}
          </div>
          {volume && (
            <div className="text-[10px] md:text-xs text-[var(--gray-500)]">
              {volume} Vol.
            </div>
          )}
        </div>
      </div>

      {/* Percentage + Change */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-base md:text-xl font-bold text-[var(--foreground)]">
          {yesPrice}%
        </span>
        {change !== undefined && change !== 0 && (
          <span
            className={`text-[10px] md:text-xs font-medium ${
              change > 0 ? "text-[var(--yes-green)]" : "text-[var(--no-red)]"
            }`}
          >
            {change > 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>

      {/* Buy Buttons */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <button
          onClick={onBuyYes}
          className="px-2 md:px-4 py-1 md:py-2 rounded-lg text-[10px] md:text-sm font-semibold bg-[var(--yes-green-bg)] text-[var(--yes-green)] hover:bg-[var(--yes-green)] hover:text-white transition-colors"
        >
          <span className="hidden sm:inline">Buy </span>Yes <span className="hidden sm:inline">{yesPrice}¢</span>
        </button>
        <button
          onClick={onBuyNo}
          className="px-2 md:px-4 py-1 md:py-2 rounded-lg text-[10px] md:text-sm font-semibold bg-[var(--no-red-bg)] text-[var(--no-red)] hover:bg-[var(--no-red)] hover:text-white transition-colors"
        >
          <span className="hidden sm:inline">Buy </span>No <span className="hidden sm:inline">{noPrice}¢</span>
        </button>
      </div>
    </div>
  );
}
