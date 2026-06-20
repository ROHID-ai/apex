import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import GeometricDecor from './GeometricDecor';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-dashed border-apex-border bg-white px-6 py-14 text-center shadow-card',
        className,
      )}
    >
      <GeometricDecor variant="minimal" />
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-card border border-apex-primary/15 bg-apex-primary-light">
        {icon ?? (
          <svg className="h-8 w-8 text-apex-primary" viewBox="0 0 32 32" fill="none" aria-hidden>
            <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 16H22M16 10V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h3 className="relative text-lg font-semibold text-apex-heading">{title}</h3>
      <p className="relative mt-2 max-w-md text-sm leading-relaxed text-apex-body">{description}</p>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
