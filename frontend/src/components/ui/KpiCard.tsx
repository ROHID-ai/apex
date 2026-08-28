import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/cn';

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  delay?: number;
  className?: string;
}

export default function KpiCard({ title, value, change, isPositive = true, icon: Icon, className }: KpiCardProps) {
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={cn('apex-card-hover group relative p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-btn bg-apex-primary-light text-apex-primary transition-transform duration-300 ease-smooth group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-pill px-2 py-1 text-xs font-semibold',
              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
            )}
          >
            {change}
            <TrendIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-apex-body">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-apex-heading">{value}</p>
    </div>
  );
}
