import { cn } from '../../lib/cn';

type Variant = 'hero' | 'section' | 'minimal';

interface GeometricDecorProps {
  variant?: Variant;
  className?: string;
}

export default function GeometricDecor({ variant = 'section', className }: GeometricDecorProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-apex-primary/8 blur-2xl" />
      </div>
    );
  }

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute -right-8 -top-10 h-32 w-32 animate-float-slow rounded-full bg-apex-primary/10 blur-2xl" />
      <div className="absolute bottom-4 left-8 h-20 w-20 animate-float-slower rounded-full bg-[#4F5DFF]/12 blur-xl" />
      <div className="absolute right-24 top-1/2 h-14 w-14 rounded-full border border-apex-primary/15 bg-apex-primary-light/50" />
      {variant === 'hero' && (
        <>
          <div className="absolute right-12 top-8 h-2 w-16 rounded-pill bg-gradient-to-r from-apex-primary/30 to-transparent" />
          <div className="absolute bottom-10 right-32 h-10 w-10 rotate-45 rounded-lg border border-apex-primary/20 bg-white/60" />
          <svg className="absolute left-6 top-6 h-8 w-8 text-apex-primary/20" viewBox="0 0 32 32" fill="none">
            <path d="M4 28L16 4L28 28H4Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </>
      )}
    </div>
  );
}
