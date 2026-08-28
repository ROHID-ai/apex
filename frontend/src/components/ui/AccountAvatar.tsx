import { cn } from '../../lib/cn';

interface AccountAvatarProps {
  name: string;
  className?: string;
}

export default function AccountAvatar({ name, className }: AccountAvatarProps) {
  const initial = name.trim().charAt(0).toLowerCase() || 'a';

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-apex-primary text-sm font-semibold lowercase text-white shadow-btn',
        className,
      )}
      aria-label={`${name} account`}
    >
      {initial}
    </div>
  );
}
