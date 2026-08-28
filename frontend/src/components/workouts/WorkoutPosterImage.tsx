interface WorkoutPosterImageProps {
  src: string;
  alt: string;
  className?: string;
  variant?: 'card' | 'thumb';
}

export default function WorkoutPosterImage({ src, alt, className = '', variant = 'card' }: WorkoutPosterImageProps) {
  const sizeClass =
    variant === 'thumb'
      ? 'aspect-[2/3] max-h-56 w-full'
      : 'aspect-[2/3] w-full';

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-slate-950 ${sizeClass} ${className}`}
      data-reveal="visible"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain object-center"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
