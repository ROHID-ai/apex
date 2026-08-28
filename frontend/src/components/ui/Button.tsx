import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'click-effect inline-flex items-center justify-center gap-2 rounded-btn text-sm font-semibold transition-all duration-200 ease-smooth disabled:pointer-events-none disabled:opacity-60',
        variant === 'primary' &&
          'bg-gradient-to-r from-apex-primary to-[#4F5DFF] px-5 py-2.5 text-white shadow-btn hover:-translate-y-0.5 hover:shadow-btn-hover',
        variant === 'secondary' &&
          'border border-apex-border bg-white px-5 py-2.5 text-apex-heading hover:border-apex-primary/30 hover:bg-apex-primary-light',
        variant === 'ghost' && 'px-3 py-2 text-apex-body hover:bg-apex-primary-light hover:text-apex-primary',
        variant === 'danger' && 'border border-red-200 bg-red-50 px-5 py-2.5 text-red-700 hover:bg-red-100',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
