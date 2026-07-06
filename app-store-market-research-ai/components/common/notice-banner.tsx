export function NoticeBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0">
        <circle cx="10" cy="10" r="8" />
        <line x1="10" y1="9" x2="10" y2="14" strokeLinecap="round" />
        <circle cx="10" cy="6" r="0.5" fill="currentColor" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
