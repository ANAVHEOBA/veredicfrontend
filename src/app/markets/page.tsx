'use client';

import { useState } from 'react';
import CategoryTabs from "@/components/market/CategoryTabs";
import SubCategoryTabs from "@/components/market/SubCategoryTabs";
import MarketGrid from "@/components/market/MarketGrid";

export default function MarketsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSubCategory, setActiveSubCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <main className="max-w-[1600px] mx-auto px-3 md:px-4 py-3 md:py-4 pb-20 md:pb-4">
        {/* Page Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-0.5 md:mb-1">
            All Markets
          </h1>
          <p className="text-sm md:text-base text-[var(--gray-500)]">
            Browse and trade on prediction markets
          </p>
        </div>

        {/* Sub-category filters */}
        <div className="mb-3 md:mb-4">
          <SubCategoryTabs
            activeSubCategory={activeSubCategory}
            onSubCategoryChange={setActiveSubCategory}
          />
        </div>

        {/* Mobile Search bar */}
        <div className="md:hidden mb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]"
              width="16"
              height="16"
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
              placeholder="Search markets"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
        </div>

        {/* Markets Grid */}
        <MarketGrid
          category={activeCategory}
          subCategory={activeSubCategory}
          searchQuery={searchQuery}
        />
      </main>
    </>
  );
}
