import { create } from 'zustand';
import type { View } from '../types';

interface SidebarFilter {
  type: 'all' | 'starred' | 'trash' | 'field_trip' | 'concept' | 'entity_type' | 'note_type';
  id?: string;
  label?: string;
}

interface UIState {
  activeView: View;
  sidebarFilter: SidebarFilter;
  searchQuery: string;
  entityPanelOpen: boolean;
  selectedEntityId: string | null;

  setActiveView: (view: View) => void;
  setSidebarFilter: (filter: SidebarFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleEntityPanel: () => void;
  setSelectedEntityId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: 'journal',
  sidebarFilter: { type: 'all' },
  searchQuery: '',
  entityPanelOpen: true,
  selectedEntityId: null,

  setActiveView: (view) => set({ activeView: view }),
  setSidebarFilter: (filter) => set({ sidebarFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleEntityPanel: () => set((s) => ({ entityPanelOpen: !s.entityPanelOpen })),
  setSelectedEntityId: (id) => set({ selectedEntityId: id, entityPanelOpen: !!id }),
}));
