"use client";

import { useState } from "react";

const sortOptions = [
  { id: "trending", name: "Trending", icon: "trending" },
  { id: "new", name: "New", icon: "new" },
];

interface SortTabsProps {
  onSortChange?: (sortId: string) => void;
}

export default function SortTabs({ onSortChange }: SortTabsProps) {
  const [activeSort, setActiveSort] = useState("trending");

  const handleSortClick = (sortId: string) => {
    setActiveSort(sortId);
    onSortChange?.(sortId);
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      {sortOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => handleSortClick(option.id)}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            activeSort === option.id
              ? "text-[var(--foreground)]"
              : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
          }`}
        >
          {option.icon === "trending" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          )}
          {option.icon === "new" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          )}
          {option.name}
          {activeSort === option.id && (
            <div className="w-1 h-1 rounded-full bg-[var(--primary)]" />
          )}
        </button>
      ))}
    </div>
  );
}
