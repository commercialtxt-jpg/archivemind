import { useRef, useState } from 'react';
import { useMedia, useUploadMedia, mediaFileUrl } from '../../hooks/useMedia';
import type { Media } from '../../types';
import PhotoLightbox from './PhotoLightbox';

interface PhotoStripProps {
  noteId: string;
}

// Only 4 shown before the overflow badge so the +N effect is clear
const MAX_VISIBLE = 4;

const PLACEHOLDER_COLORS = [
  '#8FAF9A',
  '#C4844A',
  '#CF6A4C',
  '#6B8C7A',
  '#B89C7A',
  '#A07860',
];

/**
 * Returns the URL to display for a photo thumbnail.
 * Always uses the backend file-serve endpoint when an id is present.
 */
function resolvePhotoUrl(photo: Media): string {
  return mediaFileUrl(photo.id);
}

export default function PhotoStrip({ noteId }: PhotoStripProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();

  const { data: photos, isLoading } = useMedia(noteId, 'photo');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
    const invalid = files.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (invalid.length) {
      showToast(`Too large (max 10 MB): ${invalid.map((f) => f.name).join(', ')}`);
      return;
    }

    showToast(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}...`);
    for (const file of files) {
      try {
        await uploadMedia.mutateAsync({ file, noteId, mediaType: 'photo' });
      } catch {
        showToast(`Upload failed: ${file.name}`);
      }
    }
    showToast('Uploaded');
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-[80px] h-[70px] rounded-lg bg-sand animate-pulse" />
        ))}
      </div>
    );
  }

  const safePhotos = photos ?? [];
  const visiblePhotos = safePhotos.slice(0, MAX_VISIBLE);
  const overflowCount = safePhotos.length - MAX_VISIBLE;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFilesSelected}
        aria-label="Add photos"
      />

      {/* Toast */}
      {toast && (
        <div className="text-[11px] text-coral font-medium mb-1 animate-fade-in">{toast}</div>
      )}

      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {/* Empty state inside the strip */}
          {safePhotos.length === 0 && (
            <div className="flex items-center justify-center h-[70px] min-w-[180px] bg-parchment border border-dashed border-border rounded-lg text-ink-ghost text-[12px] px-4">
              No photos — click + to add
            </div>
          )}

          {visiblePhotos.map((photo, index) => {
            const placeholderColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
            const isLastVisible = index === visiblePhotos.length - 1;
            return (
              <div
                key={photo.id}
                className="flex-shrink-0 group cursor-pointer relative"
                onClick={() => setLightboxIndex(index)}
              >
                <div
                  className="w-[80px] h-[70px] rounded-lg overflow-hidden border border-border-light group-hover:border-coral transition-colors flex items-end justify-center"
                  style={{ background: placeholderColor }}
                >
                  <img
                    src={resolvePhotoUrl(photo)}
                    alt={photo.label || photo.original_filename || 'Photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* +N badge on last visible thumbnail when there are more photos */}
                  {overflowCount > 0 && isLastVisible && (
                    <div
                      className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(index);
                      }}
                    >
                      <span className="text-white text-[13px] font-semibold">+{overflowCount}</span>
                    </div>
                  )}
                </div>
                {photo.label && (
                  <p className="text-[10px] text-ink-muted mt-1 text-center truncate w-[80px]">
                    {photo.label}
                  </p>
                )}
              </div>
            );
          })}

          {/* Add more button */}
          <button
            onClick={handleAddClick}
            disabled={uploadMedia.isPending}
            className="flex-shrink-0 w-[80px] h-[70px] rounded-lg border border-dashed border-border hover:border-coral bg-parchment hover:bg-coral/5 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            aria-label="Add photos"
          >
            <span className="text-[18px] text-ink-ghost">+</span>
            <span className="text-[9px] text-ink-ghost font-medium">
              {uploadMedia.isPending ? 'Uploading' : 'Add'}
            </span>
          </button>
        </div>
      </div>

      {/* Lightbox — rendered outside the strip so it can cover the full screen */}
      {lightboxIndex !== null && safePhotos.length > 0 && (
        <PhotoLightbox
          photos={safePhotos}
          initialIndex={lightboxIndex}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          placeholderColors={PLACEHOLDER_COLORS}
        />
      )}
    </>
  );
}
