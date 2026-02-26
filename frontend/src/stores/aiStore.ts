import { create } from 'zustand';

interface AiState {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

export const useAiStore = create<AiState>((set) => ({
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
}));
