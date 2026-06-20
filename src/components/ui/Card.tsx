import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({ children, className, title, description, action, padding = 'md' }: CardProps) {
  const paddingClass = padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-8' : 'p-6';

  return (
    <div className={cn('apex-card', paddingClass, className)}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-apex-heading">{title}</h2>}
            {description && <p className="mt-1 text-sm text-apex-body">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
