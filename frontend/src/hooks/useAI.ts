import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type {
  ApiResponse,
  AiConversation,
  AiConversationWithMessages,
  AiStatusResponse,
  SummarizeResponse,
  ChatResponse,
  CompleteResponse,
  SuggestedTag,
  RelatedNote,
  TimelineEntry,
} from '../types';

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: async () => {
      const { data } = await api.get<AiStatusResponse>('/ai/status');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSummarize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { data } = await api.post<ApiResponse<SummarizeResponse>>('/ai/summarize', {
        note_id: noteId,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

export function useAiChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      conversationId?: string | null;
      noteId?: string | null;
      message: string;
    }) => {
      const { data } = await api.post<ApiResponse<ChatResponse>>('/ai/chat', {
        conversation_id: params.conversationId ?? null,
        note_id: params.noteId ?? null,
        message: params.message,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });
}

export function useAiComplete() {
  return useMutation({
    mutationFn: async (params: { noteId?: string | null; text: string }) => {
      const { data } = await api.post<ApiResponse<CompleteResponse>>('/ai/complete', {
        note_id: params.noteId ?? null,
        text: params.text,
      });
      return data.data;
    },
  });
}

export function useSuggestTags(noteId: string | null) {
  return useQuery({
    queryKey: ['ai', 'suggest-tags', noteId],
    queryFn: async () => {
      const { data } = await api.post<ApiResponse<SuggestedTag[]>>('/ai/suggest-tags', {
        note_id: noteId,
      });
      return data.data;
    },
    enabled: !!noteId,
    staleTime: 30 * 1000,
  });
}

export function useRelatedNotes(noteId: string | null) {
  return useQuery({
    queryKey: ['ai', 'related-notes', noteId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RelatedNote[]>>(
        `/ai/related-notes/${noteId}`,
      );
      return data.data;
    },
    enabled: !!noteId,
    staleTime: 60 * 1000,
  });
}

export function useTimeline(fieldTripId?: string | null) {
  return useQuery({
    queryKey: ['ai', 'timeline', fieldTripId],
    queryFn: async () => {
      const params = fieldTripId ? `?field_trip_id=${fieldTripId}` : '';
      const { data } = await api.get<ApiResponse<TimelineEntry[]>>(
        `/ai/timeline${params}`,
      );
      return data.data;
    },
  });
}

export function useAiConversations(noteId?: string | null) {
  return useQuery({
    queryKey: ['ai', 'conversations', noteId],
    queryFn: async () => {
      const params = noteId ? `?note_id=${noteId}` : '';
      const { data } = await api.get<ApiResponse<AiConversation[]>>(
        `/ai/conversations${params}`,
      );
      return data.data;
    },
  });
}

export function useAiConversation(id: string | null) {
  return useQuery({
    queryKey: ['ai', 'conversations', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AiConversationWithMessages>>(
        `/ai/conversations/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useDeleteAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });
}
