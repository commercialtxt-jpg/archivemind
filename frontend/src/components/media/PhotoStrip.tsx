import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { ApiResponse, Media } from '../../types';
import { getMockPhotos } from '../../lib/mockData';
import PhotoLightbox from './PhotoLightbox';

interface PhotoStripProps {
  noteId: string;
}

// Only 4 shown before the overflow badge so the +N effect is clear
const MAX_VISIBLE = 4;

// Placeholder colours for mock photos (since we have no real images)
const PLACEHOLDER_COLORS = [
  '#8FAF9A',
  '#C4844A',
  '#CF6A4C',
  '#6B8C7A',
  '#B89C7A',
  '#A07860',
];

export default function PhotoStrip({ noteId }: PhotoStripProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: photos } = useQuery({
    queryKey: ['media', noteId, 'photos'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Media[]>>(`/media?note_id=${noteId}&type=photo`);
        return data.data;
      } catch {
        return getMockPhotos(noteId);
      }
    },
    enabled: !!noteId,
  });

  if (!photos?.length) {
    return (
      <div className="flex items-center justify-center h-[80px] bg-parchment border border-border-light rounded-xl text-ink-ghost text-sm">
        No photos attached
      </div>
    );
  }

  const visiblePhotos = photos.slice(0, MAX_VISIBLE);
  const overflowCount = photos.length - MAX_VISIBLE;

  return (
    <>
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
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
                  {photo.s3_key ? (
                    <img
                      src={photo.s3_key}
                      alt={photo.label || photo.original_filename || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  {/* +N badge on last visible thumbnail when there are more photos */}
                  {overflowCount > 0 && isLastVisible && (
                    <div
                      className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center"
                      onClick={(e) => {
                        // Clicking the overflow badge opens lightbox at the last visible photo
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
        </div>
      </div>

      {/* Lightbox — rendered outside the strip so it can cover the full screen */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
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
