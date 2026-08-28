import { cn } from '../../lib/cn';

type BadgeTone = 'primary' | 'success' | 'warning' | 'neutral' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  primary: 'bg-apex-primary-light text-apex-primary border-apex-primary/20',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  neutral: 'bg-slate-100 text-apex-body border-slate-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
};

export default function Badge({ children, tone = 'primary', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
