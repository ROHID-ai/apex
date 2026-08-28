import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import GeometricDecor from './GeometricDecor';

interface PageHeroProps {
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
  className?: string;
}

export default function PageHero({ title, description, badge, action, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-card border border-apex-border bg-white px-6 py-5 shadow-card sm:px-8 sm:py-6',
        className,
      )}
    >
      <GeometricDecor variant="hero" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          {badge && (
            <span className="mb-3 inline-flex items-center rounded-pill border border-apex-primary/20 bg-apex-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-wider text-apex-primary">
              {badge}
            </span>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-apex-heading sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-relaxed text-apex-body sm:text-base">{description}</p>}
        </div>
        {action && <div className="relative shrink-0">{action}</div>}
      </div>
    </section>
  );
}
