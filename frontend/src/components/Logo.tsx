type LogoProps = {
  className?: string;
  size?: 'header' | 'sidebar' | 'sm' | 'md' | 'lg' | 'xl';
};

const logoHeights: Record<NonNullable<LogoProps['size']>, string> = {
  header: 'h-8',
  sidebar: 'h-14',
  sm: 'h-12',
  md: 'h-14',
  lg: 'h-16',
  xl: 'h-20 sm:h-24',
};

const Logo = ({ className = '', size = 'md' }: LogoProps) => (
  <img
    src="/apex.png"
    alt="apex"
    className={`${logoHeights[size]} w-auto max-w-full shrink-0 object-contain object-left ${className}`}
    draggable={false}
  />
);

export default Logo;
