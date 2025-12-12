'use client';

import { useState } from 'react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    step: 1,
    title: 'Pick a Market',
    description: 'Browse prediction markets on topics you care about. Each market has YES and NO shares representing different outcomes.',
    details: [
      'YES shares pay out if the event happens',
      'NO shares pay out if it doesn\'t',
      'Prices reflect the crowd\'s probability estimate',
    ],
    icon: (
      <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
      </svg>
    ),
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    step: 2,
    title: 'Place a Trade',
    description: 'Buy shares in outcomes you believe are likely. The lower the price, the higher your potential profit if you\'re right.',
    details: [
      'Mint YES & NO shares together for 1 SUI',
      'Trade on the order book with other users',
      'Prices range from 0.01 to 0.99 SUI per share',
    ],
    icon: (
      <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    color: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    step: 3,
    title: 'Profit',
    description: 'When the market resolves, winning shares are worth 1 SUI each. Redeem your winnings or sell early to lock in profits.',
    details: [
      'Winning shares redeem for 1 SUI each',
      'Losing shares become worthless',
      'Sell anytime before resolution',
    ],
    icon: (
      <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
];

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const goToNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const current = steps[currentStep];

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
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-[var(--border)]">
          <h2 className="text-base md:text-lg font-semibold text-[var(--foreground)]">
            How Veredic Works
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

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-1.5 md:gap-2 pt-3 md:pt-4 px-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 md:w-8 bg-[var(--primary)]'
                  : 'w-1.5 bg-[var(--gray-300)] hover:bg-[var(--gray-400)]'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {/* Step Number Badge */}
          <div className="flex justify-center mb-3 md:mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-medium bg-[var(--primary)] text-white">
              Step {current.step} of {steps.length}
            </span>
          </div>

          {/* Icon */}
          <div className={`w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-5 rounded-2xl ${current.color} border ${current.borderColor} flex items-center justify-center`}>
            {current.icon}
          </div>

          {/* Title */}
          <h3 className="text-lg md:text-xl font-bold text-[var(--foreground)] text-center mb-2 md:mb-3">
            {current.title}
          </h3>

          {/* Description */}
          <p className="text-sm md:text-base text-[var(--gray-600)] text-center mb-4 md:mb-5 leading-relaxed">
            {current.description}
          </p>

          {/* Details */}
          <div className="space-y-2 md:space-y-2.5">
            {current.details.map((detail, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-xs md:text-sm text-[var(--gray-700)]">{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border-t border-[var(--border)] bg-[var(--gray-50)]">
          <button
            onClick={goToPrev}
            disabled={currentStep === 0}
            className="flex-1 py-2 md:py-2.5 px-4 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--gray-600)] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={goToNext}
            className="flex-1 py-2 md:py-2.5 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
