"use client";

import { subCategories } from "@/lib/sampleData";

interface SubCategoryTabsProps {
  activeSubCategory: string;
  onSubCategoryChange: (subCategoryId: string) => void;
}

export default function SubCategoryTabs({ activeSubCategory, onSubCategoryChange }: SubCategoryTabsProps) {
  const handleClick = (id: string) => {
    onSubCategoryChange(id);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
      {/* Filter and Bookmark icons */}
      <button className="p-1.5 md:p-2 rounded-lg hover:bg-[var(--gray-100)] text-[var(--gray-500)] shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>
      <button className="p-1.5 md:p-2 rounded-lg hover:bg-[var(--gray-100)] text-[var(--gray-500)] shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div className="w-px h-5 md:h-6 bg-[var(--gray-200)] mx-1 shrink-0" />

      {/* Sub-category pills */}
      {subCategories.map((sub) => (
        <button
          key={sub.id}
          onClick={() => handleClick(sub.id)}
          className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
            activeSubCategory === sub.id
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
          }`}
        >
          {sub.name}
        </button>
      ))}
    </div>
  );
}
