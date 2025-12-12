"use client";

const categories = [
  { id: "trending", name: "Trending", icon: "trending" },
  { id: "breaking", name: "Breaking", icon: "breaking" },
  { id: "new", name: "New", icon: "new" },
  { id: "politics", name: "Politics" },
  { id: "sports", name: "Sports" },
  { id: "finance", name: "Finance" },
  { id: "crypto", name: "Crypto" },
  { id: "tech", name: "Tech" },
  { id: "culture", name: "Culture" },
  { id: "world", name: "World" },
];

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  const handleCategoryClick = (categoryId: string) => {
    onCategoryChange(categoryId);
  };

  const renderIcon = (iconType?: string) => {
    switch (iconType) {
      case "trending":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        );
      case "breaking":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      case "new":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-b border-[var(--border)] bg-white sticky top-12 md:top-14 z-40">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center overflow-x-auto scrollbar-hide px-3 md:px-4 -mx-3 md:mx-0">
          <div className="flex items-center gap-1 py-2 md:py-2.5">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeCategory === category.id
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
                }`}
              >
                {category.icon && renderIcon(category.icon)}
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
