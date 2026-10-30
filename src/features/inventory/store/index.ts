import { create } from 'zustand';

interface InventoryUIState {
  selectedSlot: number | null;
  activeFilter: string;
  searchQuery: string;
  transferModalItemId: string | null;
  setSelectedSlot: (slot: number | null) => void;
  setActiveFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setTransferModalItemId: (itemId: string | null) => void;
}

export const useInventoryStore = create<InventoryUIState>((set) => ({
  selectedSlot: null,
  activeFilter: 'todos',
  searchQuery: '',
  transferModalItemId: null,
  setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTransferModalItemId: (transferModalItemId) => set({ transferModalItemId }),
}));
