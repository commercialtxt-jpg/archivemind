import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import EntitiesView from '../EntitiesView';
import type { ApiResponse, EntityWithStats } from '../../types';

// ---------------------------------------------------------------------------
// Mocks
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

// Stub useUIStore — EntitiesView calls setSelectedEntityId and setActiveView
vi.mock('../../stores/uiStore', () => ({
  useUIStore: (selector: (s: {
    setSelectedEntityId: () => void;
    setActiveView: () => void;
  }) => unknown) =>
    selector({
      setSelectedEntityId: vi.fn(),
      setActiveView: vi.fn(),
    }),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ENTITIES: EntityWithStats[] = [
  {
    id: 'entity-1',
    workspace_id: 'ws-1',
    name: 'Priya Ratnam',
    entity_type: 'person',
    role: 'Ayurvedic Practitioner',
    avatar_initials: 'PR',
    total_mentions: 12,
    session_count: 5,
    concept_count: 3,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'entity-2',
    workspace_id: 'ws-1',
    name: 'Kandy Highlands',
    entity_type: 'location',
    role: null,
    avatar_initials: 'KH',
    total_mentions: 8,
    session_count: 3,
    concept_count: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const ENTITIES_RESPONSE: ApiResponse<EntityWithStats[]> = {
  data: ENTITIES,
  meta: { total: 2 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, null, children)
    );
}

function freshClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntitiesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API succeeds with two entities
    mockApi.get.mockResolvedValue({ data: ENTITIES_RESPONSE });
  });

  it('renders entity cards from API data', async () => {
    const client = freshClient();
    render(<EntitiesView />, { wrapper: makeWrapper(client) });

    await waitFor(() => {
      expect(screen.getByText('Priya Ratnam')).toBeInTheDocument();
      expect(screen.getByText('Kandy Highlands')).toBeInTheDocument();
    });
  });

  it('shows filter tabs', async () => {
    const client = freshClient();
    render(<EntitiesView />, { wrapper: makeWrapper(client) });

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Interviewees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Locations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Artifacts' })).toBeInTheDocument();
  });

  it('switches filter tab on click', async () => {
    const user = userEvent.setup();
    const client = freshClient();
    render(<EntitiesView />, { wrapper: makeWrapper(client) });

    const locationTab = screen.getByRole('button', { name: 'Locations' });
    await user.click(locationTab);

    // The active tab should now have different styling (bg-white class)
    expect(locationTab.className).toMatch(/bg-white/);
  });

  it('renders entity role text', async () => {
    const client = freshClient();
    render(<EntitiesView />, { wrapper: makeWrapper(client) });

    await waitFor(() => {
      expect(screen.getByText('Ayurvedic Practitioner')).toBeInTheDocument();
    });
  });

  it('renders entity stats', async () => {
    const client = freshClient();
    render(<EntitiesView />, { wrapper: makeWrapper(client) });

    await waitFor(() => {
      expect(screen.getByText('12 mentions')).toBeInTheDocument();
      expect(screen.getByText('5 sessions')).toBeInTheDocument();
    });
  });

  it('shows empty state when list is empty', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [], meta: { total: 0 } },
    });

    const client = freshClient();
    render(<EntitiesView />, { wrapper: makeWrapper(client) });

    await waitFor(() => {
      const emptyEl = screen.queryByText('No entities yet');
      expect(emptyEl).not.toBeNull();
    });
  });
});
