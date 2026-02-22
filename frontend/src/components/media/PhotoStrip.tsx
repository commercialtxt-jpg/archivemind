import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { ApiResponse, Media } from '../../types';

interface PhotoStripProps {
  noteId: string;
}

export default function PhotoStrip({ noteId }: PhotoStripProps) {
  const { data: photos } = useQuery({
    queryKey: ['media', noteId, 'photos'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Media[]>>(`/media?note_id=${noteId}&type=photo`);
      return data.data;
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

  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {photos.map((photo) => (
          <div key={photo.id} className="flex-shrink-0 group cursor-pointer">
            <div className="w-[80px] h-[70px] rounded-lg overflow-hidden bg-sand border border-border-light group-hover:border-coral transition-colors">
              <img
                src={photo.s3_key}
                alt={photo.label || photo.original_filename || 'Photo'}
                className="w-full h-full object-cover"
              />
            </div>
            {photo.label && (
              <p className="text-[10px] text-ink-muted mt-1 text-center truncate w-[80px]">
                {photo.label}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Overflow indicator */}
      {photos.length > 6 && (
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-cream to-transparent pointer-events-none" />
      )}
    </div>
  );
}
