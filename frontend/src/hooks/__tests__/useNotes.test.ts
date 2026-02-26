import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useNotes, useToggleStar } from '../useNotes';
import type { ApiResponse, NoteSummary } from '../../types';

// ---------------------------------------------------------------------------
// Mock the API module
// ---------------------------------------------------------------------------
vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../../lib/api';
const mockApi = vi.mocked(api);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNote(overrides: Partial<NoteSummary> = {}): NoteSummary {
  return {
    id: 'note-1',
    workspace_id: 'ws-1',
    title: 'Test Note',
    body_text: 'Body text here.',
    note_type: 'field_note',
    is_starred: false,
    location_name: null,
    gps_coords: null,
    weather: null,
    tags: [],
    duration_seconds: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function freshClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns notes from the API', async () => {
    const notes = [makeNote({ id: 'note-1', title: 'First' }), makeNote({ id: 'note-2', title: 'Second' })];
    const response: ApiResponse<NoteSummary[]> = { data: notes, meta: { total: 2 } };
    mockApi.get.mockResolvedValueOnce({ data: response });

    const client = freshClient();
    const { result } = renderHook(() => useNotes(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].title).toBe('First');
  });

  it('falls back to IndexedDB/mock when API fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));

    const client = freshClient();
    const { result } = renderHook(() => useNotes(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Falls back to getMockNotes() which returns empty array in our mock
    expect(result.current.data?.data).toEqual([]);
  });
});

describe('useToggleStar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically flips is_starred in the list cache', async () => {
    const note = makeNote({ id: 'note-1', is_starred: false });
    const listResponse: ApiResponse<NoteSummary[]> = { data: [note], meta: { total: 1 } };

    // Prime the cache
    const client = freshClient();
    client.setQueryData(['notes', {}], listResponse);

    // Simulate the API being slow
    let resolveToggle!: (value: unknown) => void;
    mockApi.post.mockReturnValueOnce(
      new Promise((res) => { resolveToggle = res; })
    );

    const { result } = renderHook(() => useToggleStar(), { wrapper: makeWrapper(client) });

    await act(async () => {
      result.current.mutate('note-1');
      // Give onMutate (which is async) time to complete: cancelQueries + setQueryData
      await new Promise((r) => setTimeout(r, 20));
    });

    // Optimistic update should have flipped the note already
    const cached = client.getQueryData<ApiResponse<NoteSummary[]>>(['notes', {}]);
    expect(cached?.data[0].is_starred).toBe(true);

    // Settle the mutation
    await act(async () => {
      resolveToggle({ data: { data: { is_starred: true } } });
      await new Promise((r) => setTimeout(r, 20));
    });
  });

  it('rolls back optimistic update on API error', async () => {
    const note = makeNote({ id: 'note-1', is_starred: false });
    const listResponse: ApiResponse<NoteSummary[]> = { data: [note], meta: { total: 1 } };

    const client = freshClient();
    client.setQueryData(['notes', {}], listResponse);

    mockApi.post.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useToggleStar(), { wrapper: makeWrapper(client) });

    await act(async () => {
      result.current.mutate('note-1');
      // Wait for mutation to settle
      await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(() => expect(result.current.isIdle || result.current.isError).toBeTruthy());

    // After error, cache should be rolled back to original value
    const cached = client.getQueryData<ApiResponse<NoteSummary[]>>(['notes', {}]);
    expect(cached?.data[0].is_starred).toBe(false);
  });
});
