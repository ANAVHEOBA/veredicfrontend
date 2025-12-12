"use client";

import { useState } from "react";
import { useConnectWallet, useWallets } from "@mysten/dapp-kit";
import { useAuth } from "@/providers/AuthProvider";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const [activeTab, setActiveTab] = useState<"wallet" | "social">("wallet");
  const wallets = useWallets();
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { loginWithGoogle, isLoading: isZkLoading } = useAuth();

  if (!isOpen) return null;

  const handleWalletConnect = (wallet: (typeof wallets)[0]) => {
    connectWallet(
      { wallet },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
    // Note: This will redirect to Google, so no need to close modal
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Connect to Veredic
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--gray-100)] transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab("wallet")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "wallet"
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
            }`}
          >
            Wallet
          </button>
          <button
            onClick={() => setActiveTab("social")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "social"
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
            }`}
          >
            Social Login
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === "wallet" ? (
            <div className="space-y-2">
              {wallets.length > 0 ? (
                wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleWalletConnect(wallet)}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--gray-50)] transition-all disabled:opacity-50"
                  >
                    {wallet.icon && (
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="w-8 h-8 rounded-lg"
                      />
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-[var(--foreground)]">
                        {wallet.name}
                      </div>
                      <div className="text-xs text-[var(--gray-500)]">
                        {isConnecting ? "Connecting..." : "Connect"}
                      </div>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--gray-400)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--gray-400)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-[var(--foreground)] mb-2">
                    No Wallets Found
                  </h3>
                  <p className="text-sm text-[var(--gray-500)] mb-4">
                    Install a Sui wallet to connect
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="https://suiwallet.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      Get Sui Wallet
                    </a>
                    <a
                      href="https://suiet.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      Get Suiet Wallet
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={isZkLoading}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)] transition-all disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-[var(--gray-200)]">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-[var(--foreground)]">
                    Continue with Google
                  </div>
                  <div className="text-xs text-[var(--gray-500)]">
                    {isZkLoading ? "Loading..." : "No wallet needed"}
                  </div>
                </div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gray-400)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              {/* Info text */}
              <div className="mt-4 p-3 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)]">
                <div className="flex items-start gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <p className="text-xs text-[var(--gray-600)]">
                    Social login creates a secure wallet linked to your account.
                    No seed phrases needed. Powered by Sui zkLogin.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--gray-50)]">
          <p className="text-xs text-center text-[var(--gray-500)]">
            By connecting, you agree to our{" "}
            <a href="/terms" className="text-[var(--primary)] hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-[var(--primary)] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
