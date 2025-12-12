'use client';

import { useState } from 'react';
import MarketGrid from "@/components/market/MarketGrid";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <main className="max-w-[1600px] mx-auto px-3 md:px-4 py-4 md:py-6 pb-20 md:pb-8">
      {/* Search Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-3 md:mb-4">
          Search Markets
        </h1>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by market name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-3.5 bg-white border border-[var(--border)] rounded-xl text-sm md:text-base focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--gray-100)] transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gray-400)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery ? (
        <div>
          <p className="text-xs md:text-sm text-[var(--gray-500)] mb-3 md:mb-4">
            Showing results for "{searchQuery}"
          </p>
          <MarketGrid
            category="all"
            subCategory="all"
            searchQuery={searchQuery}
          />
        </div>
      ) : (
        <div className="text-center py-8 md:py-12">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg
              className="w-8 h-8 md:w-10 md:h-10 text-[var(--gray-400)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <h2 className="text-base md:text-lg font-semibold text-[var(--foreground)] mb-1.5 md:mb-2">
            Search for Markets
          </h2>
          <p className="text-sm md:text-base text-[var(--gray-500)] max-w-md mx-auto">
            Type in the search box above to find prediction markets on any topic.
          </p>
        </div>
      )}
    </main>
  );
}
