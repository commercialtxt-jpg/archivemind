import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { cacheMediaMetadata, getCachedMediaMetadata, storeMediaBlob } from '../lib/offlineDb';
import { useOfflineStore } from '../stores/offlineStore';
import type { ApiResponse, Media } from '../types';

/** Check if an error is a network failure. */
function isNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    if ('code' in err && (err as { code?: string }).code === 'ERR_NETWORK') return true;
    if ('message' in err && typeof (err as { message?: string }).message === 'string') {
      const msg = (err as { message: string }).message.toLowerCase();
      if (msg.includes('network error') || msg.includes('failed to fetch')) return true;
    }
    if ('response' in err && (err as { response?: unknown }).response === undefined) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// useMedia — list media for a note (optionally filtered by type)
// ---------------------------------------------------------------------------
export function useMedia(noteId: string | null, mediaType?: 'photo' | 'audio') {
  return useQuery({
    queryKey: ['media', { noteId, mediaType }],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (noteId) params.set('note_id', noteId);
        if (mediaType) params.set('type', mediaType);
        const { data } = await api.get<ApiResponse<Media[]>>(`/media?${params}`);
        const media = data.data ?? [];
        if (media.length > 0) cacheMediaMetadata(media).catch(() => {});
        return media;
      } catch {
        if (noteId) {
          const cached = await getCachedMediaMetadata(noteId);
          if (cached.length > 0) {
            return mediaType ? cached.filter((m) => m.media_type === mediaType) : cached;
          }
        }
        return [] as Media[];
      }
    },
    enabled: !!noteId,
  });
}

// ---------------------------------------------------------------------------
// useUploadMedia — POST /api/v1/media/upload (multipart)
// ---------------------------------------------------------------------------
interface UploadMediaArgs {
  file: File;
  noteId: string;
  mediaType: 'photo' | 'audio';
  onProgress?: (pct: number) => void;
}

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, noteId, mediaType, onProgress }: UploadMediaArgs) => {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('note_id', noteId);
        form.append('media_type', mediaType);

        const { data } = await api.post<ApiResponse<Media>>('/media/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (onProgress && evt.total) {
              onProgress(Math.round((evt.loaded * 100) / evt.total));
            }
          },
        });
        return data.data;
      } catch (err) {
        if (isNetworkError(err) || useOfflineStore.getState().isOffline) {
          // Store raw file data in IndexedDB for later upload
          const buffer = await file.arrayBuffer();
          const blobId = `offline-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

          await storeMediaBlob({
            id: blobId,
            noteId,
            mediaType,
            data: buffer,
            filename: file.name,
            mimeType: file.type,
            createdAt: new Date().toISOString(),
          });

          useOfflineStore.getState().incrementPending();

          // Return a placeholder Media object so the UI can proceed
          return {
            id: blobId,
            note_id: noteId,
            media_type: mediaType,
            s3_key: '',
            original_filename: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
            duration_seconds: null,
            label: null,
            transcription_status: 'none',
            transcription_text: null,
            sort_order: 0,
            created_at: new Date().toISOString(),
          } as Media;
        }
        throw err;
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidate both typed and untyped queries for this note
      queryClient.invalidateQueries({ queryKey: ['media', { noteId: variables.noteId }] });
      queryClient.invalidateQueries({
        queryKey: ['media', { noteId: variables.noteId, mediaType: variables.mediaType }],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteMedia — DELETE /api/v1/media/:id
// ---------------------------------------------------------------------------
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/media/${id}`);
      return id;
    },
    onSuccess: () => {
      // Invalidate all media queries (we don't know which noteId from here easily)
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

// ---------------------------------------------------------------------------
// mediaFileUrl — helper to build the URL for serving a media file
// ---------------------------------------------------------------------------
export function mediaFileUrl(mediaId: string): string {
  return `/api/v1/media/${mediaId}/file`;
}
