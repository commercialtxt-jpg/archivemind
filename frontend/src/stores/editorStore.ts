import { create } from 'zustand';

interface EditorState {
  activeNoteId: string | null;
  isDirty: boolean;

  setActiveNoteId: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeNoteId: null,
  isDirty: false,

  setActiveNoteId: (id) => set({ activeNoteId: id, isDirty: false }),
  setDirty: (dirty) => set({ isDirty: dirty }),
}));
