import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { type PosterType, renderQrPosterDataUrl } from '../../utils/qrPoster';

interface QrPosterPreviewProps {
  type: PosterType;
  url: string;
  alt: string;
  className?: string;
}

export default function QrPosterPreview({ type, url, alt, className = '' }: QrPosterPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    setError(false);

    renderQrPosterDataUrl(type, url, 420)
      .then((dataUrl) => {
        if (!cancelled) setPreviewUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [type, url]);

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-btn border border-apex-border bg-apex-surface p-6 text-sm text-apex-body ${className}`}>
        Unable to load poster preview
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className={`flex items-center justify-center rounded-btn border border-apex-border bg-apex-surface p-10 transition-opacity duration-300 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-apex-primary" />
      </div>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={alt}
      className={`w-full animate-fade-in-scale rounded-btn border border-apex-border object-contain motion-reduce:animate-none ${className}`}
    />
  );
}
