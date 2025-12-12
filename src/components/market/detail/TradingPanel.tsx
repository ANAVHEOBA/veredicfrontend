"use client";

import { useState } from "react";
import Image from "next/image";
import { Outcome } from "@/types/market";

type OrderType = "market" | "limit";
type Side = "buy" | "sell";
type Position = "yes" | "no";

interface TradingPanelProps {
  outcome: Outcome;
  onTrade?: (params: {
    side: Side;
    position: Position;
    amount: number;
    orderType: OrderType;
    limitPrice?: number;
  }) => void;
  balance?: number; // User's available balance
  isConnected?: boolean;
  onConnect?: () => void;
}

export default function TradingPanel({
  outcome,
  onTrade,
  balance = 0,
  isConnected = false,
  onConnect,
}: TradingPanelProps) {
  const [side, setSide] = useState<Side>("buy");
  const [position, setPosition] = useState<Position>("yes");
  const [amount, setAmount] = useState<number>(0);
  const [orderType, setOrderType] = useState<OrderType>("market");

  const yesPrice = outcome.price;
  const noPrice = 100 - outcome.price;
  const currentPrice = position === "yes" ? yesPrice : noPrice;

  // Quick amount buttons
  const quickAmounts = [1, 20, 100];

  const handleQuickAmount = (value: number) => {
    setAmount((prev) => prev + value);
  };

  const handleMaxAmount = () => {
    if (balance > 0) {
      setAmount(balance);
    }
  };

  const handleTrade = () => {
    if (onTrade && amount > 0) {
      onTrade({
        side,
        position,
        amount,
        orderType,
      });
    }
  };

  // Calculate potential return
  const shares = side === "buy" ? amount / (currentPrice / 100) : amount;
  const potentialReturn = side === "buy" ? shares - amount : amount * (currentPrice / 100);

  return (
    <div className="card p-4 md:p-5">
      {/* Outcome Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--gray-100)]">
        {outcome.image ? (
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[var(--gray-100)]">
            <Image
              src={outcome.image}
              alt={outcome.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full shrink-0 bg-[var(--gray-200)] flex items-center justify-center text-sm font-bold text-[var(--gray-600)]">
            {outcome.name.charAt(0)}
          </div>
        )}
        <span className="font-semibold text-[var(--foreground)]">{outcome.name}</span>
      </div>

      {/* Buy/Sell Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-lg mb-4">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            side === "buy"
              ? "bg-white text-[var(--foreground)] shadow-sm"
              : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            side === "sell"
              ? "bg-white text-[var(--foreground)] shadow-sm"
              : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type Dropdown */}
      <div className="flex justify-end mb-3">
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderType)}
          className="text-sm text-[var(--gray-600)] bg-transparent border-none cursor-pointer focus:outline-none"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </div>

      {/* Yes/No Position Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPosition("yes")}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
            position === "yes"
              ? "bg-[var(--yes-green)] text-white"
              : "bg-[var(--yes-green-bg)] text-[var(--yes-green)] hover:bg-[var(--yes-green)] hover:text-white"
          }`}
        >
          Yes {yesPrice}¢
        </button>
        <button
          onClick={() => setPosition("no")}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
            position === "no"
              ? "bg-[var(--no-red)] text-white"
              : "bg-[var(--no-red-bg)] text-[var(--no-red)] hover:bg-[var(--no-red)] hover:text-white"
          }`}
        >
          No {noPrice}¢
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-3">
        <label className="block text-sm text-[var(--gray-600)] mb-2">Amount</label>
        <div className="text-3xl md:text-4xl font-bold text-[var(--foreground)] text-right mb-3">
          ${amount.toFixed(0)}
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              onClick={() => handleQuickAmount(value)}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors"
            >
              +${value}
            </button>
          ))}
          <button
            onClick={handleMaxAmount}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors"
          >
            Max
          </button>
        </div>
      </div>

      {/* Trade Button */}
      {isConnected ? (
        <button
          onClick={handleTrade}
          disabled={amount <= 0}
          className={`w-full py-3 md:py-4 rounded-xl text-base font-semibold transition-colors ${
            amount > 0
              ? position === "yes"
                ? "bg-[var(--yes-green)] text-white hover:opacity-90"
                : "bg-[var(--no-red)] text-white hover:opacity-90"
              : "bg-[var(--gray-200)] text-[var(--gray-500)] cursor-not-allowed"
          }`}
        >
          {side === "buy" ? "Buy" : "Sell"} {position === "yes" ? "Yes" : "No"}
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="w-full py-3 md:py-4 rounded-xl text-base font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
        >
          Connect Wallet
        </button>
      )}

      {/* Terms */}
      <p className="text-xs text-[var(--gray-500)] text-center mt-3">
        By trading, you agree to the{" "}
        <a href="#" className="underline hover:text-[var(--gray-700)]">
          Terms of Use
        </a>
      </p>
    </div>
  );
}
