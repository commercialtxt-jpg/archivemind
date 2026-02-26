import { useEffect, useCallback, useState } from 'react';
import type { Media } from '../../types';
import { mediaFileUrl, useDeleteMedia } from '../../hooks/useMedia';

/**
 * Returns a URL for the photo. Uses the backend file-serve endpoint.
 * Falls back to a picsum placeholder only when s3_key is empty (legacy data).
 */
function resolvePhotoUrl(photo: Media): string {
  return mediaFileUrl(photo.id);
}

function resolveThumbUrl(photo: Media): string {
  return mediaFileUrl(photo.id);
}

interface PhotoLightboxProps {
  photos: Media[];
  initialIndex: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
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
  onDelete,
  placeholderColors = DEFAULT_PLACEHOLDER_COLORS,
}: PhotoLightboxProps) {
  const photo = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMedia = useDeleteMedia();

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(currentIndex + 1);
  }, [hasNext, currentIndex, onIndexChange]);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(currentIndex - 1);
  }, [hasPrev, currentIndex, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDelete) setConfirmDelete(false);
        else onClose();
      } else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev, confirmDelete]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleDelete = async () => {
    if (!photo) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteMedia.mutateAsync(photo.id);
      onDelete?.(photo.id);
      // Navigate away from deleted item
      if (photos.length <= 1) {
        onClose();
      } else if (currentIndex >= photos.length - 1) {
        onIndexChange(currentIndex - 1);
      }
    } catch {
      // Error is handled silently — query invalidation will refresh the list
    }
    setConfirmDelete(false);
  };

  if (!photo) return null;

  const placeholderColor =
    placeholderColors[currentIndex % placeholderColors.length];

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in"
      style={{ background: 'rgba(42,36,32,0.92)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        // Close when clicking the backdrop (not the photo itself)
        if (e.target === e.currentTarget) {
          if (confirmDelete) setConfirmDelete(false);
          else onClose();
        }
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

      {/* Delete button — top-left area */}
      <div className="absolute top-5 left-5 flex items-center gap-2">
        {confirmDelete ? (
          <>
            <span className="text-white/70 text-[12px]">Delete?</span>
            <button
              onClick={handleDelete}
              disabled={deleteMedia.isPending}
              className="px-2 py-1 rounded bg-coral text-white text-[11px] font-medium hover:bg-coral/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              {deleteMedia.isPending ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 rounded bg-white/10 text-white/70 text-[11px] hover:bg-white/20 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-coral/20 text-white/60 hover:text-coral transition-colors cursor-pointer"
            aria-label="Delete photo"
            title="Delete photo"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 4h10M6 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M5 4l.5 9M11 4l-.5 9M8 4v9" />
            </svg>
          </button>
        )}
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
        className="flex flex-col items-center gap-4 px-20 animate-scale-in"
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
          <img
            src={resolvePhotoUrl(photo)}
            alt={photo.label || photo.original_filename || 'Photo'}
            className="object-contain max-w-full max-h-[70vh] rounded-xl"
            style={{ display: 'block' }}
          />
        </div>

        {/* Caption */}
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
                  <img
                    src={resolveThumbUrl(p)}
                    alt={p.label || ''}
                    className="w-full h-full object-cover"
                    style={{ background: thumbColor }}
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
