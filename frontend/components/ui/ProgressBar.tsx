interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  label?: string;
}

export function ProgressBar({ value, className = '', label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={className} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? `${clamped}% complete`}>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-indigo-600 h-2 rounded-full progress-bar"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label && (
        <p className="sr-only">{label}</p>
      )}
    </div>
  );
}
