import { create } from 'zustand';
import type { View } from '../types';

interface SidebarFilter {
  type: 'all' | 'starred' | 'trash' | 'field_trip' | 'concept' | 'entity_type' | 'note_type';
  id?: string;
  label?: string;
}

interface MapFlyTo {
  lat: number;
  lng: number;
  label?: string;
}

interface UIState {
  activeView: View;
  sidebarFilter: SidebarFilter;
  searchQuery: string;
  entityPanelOpen: boolean;
  selectedEntityId: string | null;
  /** When set, FullMap will fly to these coordinates on the next mount/render. */
  mapFlyTo: MapFlyTo | null;
  /** Mobile: controls the slide-in drawer visibility */
  drawerOpen: boolean;
  /** Mobile: toggles between NoteList and NoteEditor in JournalView */
  mobileShowEditor: boolean;

  setActiveView: (view: View) => void;
  setSidebarFilter: (filter: SidebarFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleEntityPanel: () => void;
  setSelectedEntityId: (id: string | null) => void;
  setMapFlyTo: (target: MapFlyTo | null) => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  setMobileShowEditor: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: 'journal',
  sidebarFilter: { type: 'all' },
  searchQuery: '',
  entityPanelOpen: true,
  selectedEntityId: null,
  mapFlyTo: null,
  drawerOpen: false,
  mobileShowEditor: false,

  setActiveView: (view) => set({ activeView: view }),
  setSidebarFilter: (filter) => set({ sidebarFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleEntityPanel: () => set((s) => ({ entityPanelOpen: !s.entityPanelOpen })),
  // Keep panel open regardless; when deselecting, panel stays open showing the browser list
  setSelectedEntityId: (id) => set((s) => ({ selectedEntityId: id, entityPanelOpen: id ? true : s.entityPanelOpen })),
  setMapFlyTo: (target) => set({ mapFlyTo: target }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  setMobileShowEditor: (show) => set({ mobileShowEditor: show }),
}));
