"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useBalance } from "@/lib/hooks/useBalance";
import ConnectModal from "@/components/ui/ConnectModal";
import CreateMarketModal from "@/components/market/CreateMarketModal";
import HowItWorksModal from "@/components/ui/HowItWorksModal";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const { user, isAuthenticated, authMethod, logout } = useAuth();
  const { data: balance, isLoading: isBalanceLoading } = useBalance();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-3 md:px-4">
          <div className="flex items-center justify-between h-12 md:h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="md:w-5 md:h-5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-lg md:text-xl font-bold text-[var(--foreground)]">
                Veredic
              </span>
            </Link>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]"
                  width="18"
                  height="18"
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
                  className="w-full pl-10 pr-4 py-2 bg-[var(--gray-100)] border border-transparent rounded-full text-sm focus:outline-none focus:border-[var(--primary)] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/markets"
                className="text-sm font-medium text-[var(--gray-600)] hover:text-[var(--foreground)] transition-colors px-3 py-2"
              >
                Markets
              </Link>
              <button
                onClick={() => setIsHowItWorksOpen(true)}
                className="text-sm font-medium text-[var(--gray-600)] hover:text-[var(--foreground)] transition-colors px-3 py-2"
              >
                How it works
              </button>
            </div>

            {/* Auth Section */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {/* Create Market Button */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--primary)] border border-[var(--primary)] rounded-full hover:bg-[var(--primary)] hover:text-white transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  Create
                </button>
                {/* User Menu */}
                <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-full border border-[var(--border)] hover:border-[var(--gray-300)] transition-colors"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || "User"}
                      className="w-5 h-5 md:w-6 md:h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium text-[var(--foreground)]">
                    {formatAddress(user.address)}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 md:w-64 bg-white rounded-xl border border-[var(--border)] shadow-lg z-20 overflow-hidden">
                      {/* User Info */}
                      <div className="p-3 md:p-4 border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          {user.picture ? (
                            <img
                              src={user.picture}
                              alt={user.name || "User"}
                              className="w-9 h-9 md:w-10 md:h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {user.name && (
                              <div className="font-medium text-[var(--foreground)] truncate text-sm">
                                {user.name}
                              </div>
                            )}
                            <div className="text-xs text-[var(--gray-500)] truncate">
                              {formatAddress(user.address)}
                            </div>
                          </div>
                        </div>
                        {/* Balance */}
                        <div className="mt-3 p-2.5 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--gray-500)]">Balance</span>
                            <span className="text-sm font-semibold text-[var(--foreground)]">
                              {isBalanceLoading ? (
                                <span className="inline-block w-16 h-4 bg-[var(--gray-200)] rounded animate-pulse" />
                              ) : (
                                balance?.formatted || "0 SUI"
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                            {authMethod === "wallet" ? "Wallet" : "Google"}
                          </span>
                          <span className="text-xs text-[var(--gray-500)]">
                            Testnet
                          </span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-1.5 md:p-2">
                        <Link
                          href="/portfolio"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--gray-50)] transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                          </svg>
                          <span className="text-sm text-[var(--foreground)]">Portfolio</span>
                        </Link>
                        <Link
                          href="/activity"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--gray-50)] transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                          </svg>
                          <span className="text-sm text-[var(--foreground)]">Activity</span>
                        </Link>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user.address);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--gray-50)] transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span className="text-sm text-[var(--foreground)]">Copy Address</span>
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="p-1.5 md:p-2 border-t border-[var(--border)]">
                        <button
                          onClick={() => {
                            logout();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--no-red-bg)] text-[var(--no-red)] transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          <span className="text-sm">Disconnect</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="text-sm font-medium text-[var(--gray-700)] hover:text-[var(--foreground)] px-2 md:px-3 py-1.5 md:py-2"
                >
                  Log In
                </button>
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="btn btn-primary text-sm rounded-full px-4 md:px-5 py-2"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </>
  );
}
