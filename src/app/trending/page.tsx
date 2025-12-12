'use client';

import CategoryTabs from "@/components/market/CategoryTabs";
import SubCategoryTabs from "@/components/market/SubCategoryTabs";
import MarketGrid from "@/components/market/MarketGrid";
import { useState } from 'react';

export default function TrendingPage() {
  const [activeSubCategory, setActiveSubCategory] = useState("all");

  return (
    <>
      <CategoryTabs
        activeCategory="trending"
        onCategoryChange={() => {}}
      />
      <main className="max-w-[1600px] mx-auto px-3 md:px-4 py-3 md:py-4 pb-20 md:pb-8">
        {/* Page Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-1 md:mb-2">
            <svg
              className="w-5 h-5 md:w-6 md:h-6 text-[var(--primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)]">
              Trending Markets
            </h1>
          </div>
          <p className="text-sm md:text-base text-[var(--gray-500)]">
            Most active and popular markets right now
          </p>
        </div>

        {/* Sub-category filters */}
        <div className="mb-3 md:mb-4">
          <SubCategoryTabs
            activeSubCategory={activeSubCategory}
            onSubCategoryChange={setActiveSubCategory}
          />
        </div>

        {/* Markets Grid - showing trending markets */}
        <MarketGrid
          category="trending"
          subCategory={activeSubCategory}
          searchQuery=""
        />
      </main>
    </>
  );
}
