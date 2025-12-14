"use client";

import Image from "next/image";
import { Market } from "@/types/market";

interface MarketHeaderProps {
  market: Market;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  onShare?: () => void;
}

export default function MarketHeader({
  market,
  onBookmark,
  isBookmarked = false,
  onShare
}: MarketHeaderProps) {
  const { title, image, volume, endTime, category } = market;

  const formatDate = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-start gap-3 md:gap-4">
      {/* Market Icon */}
      {image ? (
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shrink-0 bg-[var(--gray-100)]">
          <Image
            src={image}
            alt={title}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl shrink-0 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
          </svg>
        </div>
      )}

      {/* Title and Meta */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg md:text-xl font-bold text-[var(--foreground)] leading-tight mb-2">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-[var(--gray-500)]">
          {/* Volume */}
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="font-medium">{volume} Vol.</span>
          </div>

          {/* End Date */}
          {endTime && (
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatDate(endTime)}</span>
            </div>
          )}

          {/* Category */}
          {category && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-xs">
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Share */}
        <button
          onClick={onShare}
          className="p-2 rounded-lg hover:bg-[var(--gray-100)] text-[var(--gray-500)] hover:text-[var(--gray-700)] transition-colors"
          aria-label="Share"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>

        {/* Bookmark */}
        <button
          onClick={onBookmark}
          className={`p-2 rounded-lg transition-colors ${
            isBookmarked
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-[var(--gray-100)] text-[var(--gray-500)] hover:text-[var(--gray-700)]"
          }`}
          aria-label="Bookmark"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
