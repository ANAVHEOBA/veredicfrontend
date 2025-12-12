'use client';

import { useState } from 'react';
import { useCreateMarket } from '@/lib/hooks/useMarketActions';
import type { ResolutionType } from '@/types/market';

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
  const { createMarket, isLoading, error } = useCreateMarket();

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [outcomeYesLabel, setOutcomeYesLabel] = useState('Yes');
  const [outcomeNoLabel, setOutcomeNoLabel] = useState('No');
  const [resolutionType, setResolutionType] = useState<ResolutionType>('oracle');
  const [resolutionSource, setResolutionSource] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories = ['General', 'Politics', 'Sports', 'Finance', 'Crypto', 'Tech', 'Culture', 'World'];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim() || !endDate || !endTime) return;

    // Validate question length (contract requires min 10 chars)
    if (question.trim().length < 10) {
      alert('Question must be at least 10 characters');
      return;
    }

    const endDateTime = new Date(`${endDate}T${endTime}`);
    // Contract requires end_time > now + 1 hour
    const minEndTime = new Date(Date.now() + 3600000);
    if (endDateTime <= minEndTime) {
      alert('End time must be at least 1 hour in the future');
      return;
    }

    // Parse tags from comma-separated string
    const parsedTags = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const result = await createMarket({
      question: question.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
      category,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      outcomeYesLabel: outcomeYesLabel.trim() || 'Yes',
      outcomeNoLabel: outcomeNoLabel.trim() || 'No',
      resolutionType,
      resolutionSource: resolutionSource.trim() || undefined,
      endTime: endDateTime,
    });

    if (result.success) {
      setQuestion('');
      setDescription('');
      setImageUrl('');
      setCategory('General');
      setTags('');
      setOutcomeYesLabel('Yes');
      setOutcomeNoLabel('No');
      setResolutionType('oracle');
      setResolutionSource('');
      setEndDate('');
      setEndTime('');
      setShowAdvanced(false);
      onClose();
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Create Market
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Question *
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will Bitcoin reach $100k by end of 2025?"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
              required
            />
            <p className="mt-1 text-xs text-[var(--gray-500)]">
              Ask a yes/no question that can be resolved objectively
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context, resolution criteria, and data sources..."
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
            <p className="mt-1 text-xs text-[var(--gray-500)]">
              Optional image to display with the market
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors bg-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Labels */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Outcome Labels
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={outcomeYesLabel}
                  onChange={(e) => setOutcomeYesLabel(e.target.value)}
                  placeholder="Yes"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
                <p className="mt-1 text-xs text-[var(--gray-500)]">Yes outcome</p>
              </div>
              <div>
                <input
                  type="text"
                  value={outcomeNoLabel}
                  onChange={(e) => setOutcomeNoLabel(e.target.value)}
                  placeholder="No"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
                <p className="mt-1 text-xs text-[var(--gray-500)]">No outcome</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--gray-500)]">
              Customize labels for versus-style markets (e.g., "Trump" vs "Biden")
            </p>
          </div>

          {/* Resolution Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Resolution Method
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--primary)] transition-colors">
                <input
                  type="radio"
                  name="resolutionType"
                  value="oracle"
                  checked={resolutionType === 'oracle'}
                  onChange={() => setResolutionType('oracle')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    Oracle Resolved
                  </div>
                  <div className="text-xs text-[var(--gray-500)]">
                    A trusted oracle will resolve this market based on real-world data
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--primary)] transition-colors">
                <input
                  type="radio"
                  name="resolutionType"
                  value="admin"
                  checked={resolutionType === 'admin'}
                  onChange={() => setResolutionType('admin')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    Admin Resolved
                  </div>
                  <div className="text-xs text-[var(--gray-500)]">
                    Platform admin will resolve this market
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={minDate}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                required
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
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
              className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-[var(--gray-50)] rounded-lg border border-[var(--gray-200)]">
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="bitcoin, crypto, price"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors bg-white"
                />
                <p className="mt-1 text-xs text-[var(--gray-500)]">
                  Comma-separated tags for filtering
                </p>
              </div>

              {/* Resolution Source */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Resolution Source
                </label>
                <input
                  type="text"
                  value={resolutionSource}
                  onChange={(e) => setResolutionSource(e.target.value)}
                  placeholder="e.g., CoinGecko, Official Government Website"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors bg-white"
                />
                <p className="mt-1 text-xs text-[var(--gray-500)]">
                  Where the outcome will be verified
                </p>
              </div>
            </div>
          )}

          {/* Fee Notice */}
          <div className="p-3 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)]">
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
                Creating a market costs 0.01 SUI. This fee helps prevent spam and supports
                the platform.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !question.trim() || !endDate || !endTime}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Market'}
          </button>
        </form>
      </div>
    </div>
  );
}
