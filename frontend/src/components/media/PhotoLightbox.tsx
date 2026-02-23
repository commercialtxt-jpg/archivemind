import { useEffect, useCallback } from 'react';
import type { Media } from '../../types';

interface PhotoLightboxProps {
  photos: Media[];
  initialIndex: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  placeholderColors?: string[];
}

const DEFAULT_PLACEHOLDER_COLORS = [
  '#8FAF9A',
  '#C4844A',
  '#CF6A4C',
  '#6B8C7A',
  '#B89C7A',
  '#A07860',
];

export default function PhotoLightbox({
  photos,
  currentIndex,
  onIndexChange,
  onClose,
  placeholderColors = DEFAULT_PLACEHOLDER_COLORS,
}: PhotoLightboxProps) {
  const photo = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(currentIndex + 1);
  }, [hasNext, currentIndex, onIndexChange]);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(currentIndex - 1);
  }, [hasPrev, currentIndex, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!photo) return null;

  const placeholderColor =
    placeholderColors[currentIndex % placeholderColors.length];

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(42,36,32,0.92)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        // Close when clicking the backdrop (not the photo itself)
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        aria-label="Close lightbox"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 font-mono text-[12px]">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Prev arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        disabled={!hasPrev}
        className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
        aria-label="Previous photo"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M10 12L6 8l4-4" />
        </svg>
      </button>

      {/* Next arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        disabled={!hasNext}
        className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
        aria-label="Next photo"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>

      {/* Photo */}
      <div
        className="flex flex-col items-center gap-4 px-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            maxWidth: 'min(80vw, 900px)',
            maxHeight: '70vh',
            background: placeholderColor,
          }}
        >
          {photo.s3_key ? (
            <img
              src={photo.s3_key}
              alt={photo.label || photo.original_filename || 'Photo'}
              className="object-contain max-w-full max-h-[70vh] rounded-xl"
              style={{ display: 'block' }}
            />
          ) : (
            /* Placeholder when no real image URL */
            <div
              className="flex items-center justify-center text-white/40 text-sm"
              style={{ width: 480, height: 320 }}
            >
              {photo.original_filename || 'Photo'}
            </div>
          )}
        </div>

        {/* Label */}
        {(photo.label || photo.original_filename) && (
          <p className="text-white/70 text-sm text-center max-w-md">
            {photo.label || photo.original_filename}
          </p>
        )}

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-2 mt-1 max-w-[80vw] overflow-x-auto pb-1">
            {photos.map((p, idx) => {
              const thumbColor =
                placeholderColors[idx % placeholderColors.length];
              return (
                <button
                  key={p.id}
                  onClick={() => onIndexChange(idx)}
                  className={`flex-shrink-0 w-12 h-10 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'border-coral'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                >
                  {p.s3_key ? (
                    <img
                      src={p.s3_key}
                      alt={p.label || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: thumbColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
