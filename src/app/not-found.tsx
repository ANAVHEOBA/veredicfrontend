import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center bg-[var(--gray-50)]">
      <div className="text-center px-4 py-8 md:py-12">
        {/* 404 Illustration */}
        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
          <svg
            className="w-10 h-10 md:w-12 md:h-12 text-[var(--gray-400)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>

        {/* Error Code */}
        <div className="text-5xl md:text-6xl font-bold text-[var(--gray-300)] mb-2 md:mb-3">
          404
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-2 md:mb-3">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-sm md:text-base text-[var(--gray-500)] mb-6 md:mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/markets"
            className="w-full sm:w-auto px-6 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
          >
            Browse Markets
          </Link>
        </div>

        {/* Help Link */}
        <p className="mt-6 md:mt-8 text-xs md:text-sm text-[var(--gray-500)]">
          Need help?{' '}
          <a
            href="https://discord.gg/veredic"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] hover:underline"
          >
            Join our Discord
          </a>
        </p>
      </div>
    </div>
  );
}
