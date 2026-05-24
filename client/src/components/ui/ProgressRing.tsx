import { cn } from '@/lib/cn';

type ProgressRingProps = {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
};

export const ProgressRing = ({
  value,
  size = 56,
  strokeWidth = 5,
  className,
  showLabel = true,
}: ProgressRingProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const id = `pr-${size}-${strokeWidth}`;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D9FF" />
            <stop offset="100%" stopColor="#35FFB6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(138, 155, 184, 0.18)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute font-mono text-[11px] font-medium text-text-main">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
};
