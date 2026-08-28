type LogoProps = {
  className?: string;
  size?: 'header' | 'sidebar' | 'sm' | 'md' | 'lg' | 'xl';
};

const logoHeights: Record<NonNullable<LogoProps['size']>, string> = {
  header: 'h-7',
  sidebar: 'h-11',
  sm: 'h-10',
  md: 'h-12',
  lg: 'h-14',
  xl: 'h-16 sm:h-20',
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
