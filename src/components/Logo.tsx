type LogoProps = {
  className?: string;
  size?: 'sidebar' | 'sm' | 'md' | 'lg' | 'xl';
};

const iconSizes: Record<NonNullable<LogoProps['size']>, string> = {
  sidebar: 'h-9 w-9',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
  xl: 'h-12 w-12 sm:h-14 sm:w-14',
};

const textSizes: Record<NonNullable<LogoProps['size']>, string> = {
  sidebar: 'text-[1.35rem]',
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl sm:text-[1.65rem]',
  xl: 'text-[1.75rem] sm:text-[2rem]',
};

const Logo = ({ className = '', size = 'md' }: LogoProps) => (
  <div className={`inline-flex max-w-full items-center gap-2.5 ${className}`}>
    <img
      src="/favicon-32.png"
      alt=""
      aria-hidden
      className={`${iconSizes[size]} shrink-0 object-contain`}
      draggable={false}
    />
    <span className={`${textSizes[size]} font-semibold lowercase leading-none tracking-tight text-apex-heading`}>
      apex
    </span>
  </div>
);

export default Logo;
