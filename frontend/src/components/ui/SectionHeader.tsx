interface SectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeader({ title, description, className = '' }: SectionHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-base font-semibold text-apex-heading">{title}</h2>
      {description && <p className="mt-1 text-sm text-apex-body">{description}</p>}
    </div>
  );
}
