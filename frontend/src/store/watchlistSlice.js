import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWatchlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find(
          (i) => i.id === item.id && i.sport === item.sport && i.type === item.type
        );
        if (!existing) {
          set((state) => ({ items: [...state.items, { ...item, pinnedAt: Date.now() }] }));
        }
      },

      removeItem: (id, sport, type) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.id === id && i.sport === sport && i.type === type)
          ),
        }));
      },

      isPinned: (id, sport, type) => {
        return get().items.some(
          (i) => i.id === id && i.sport === sport && i.type === type
        );
      },

      clearAll: () => set({ items: [] }),
    }),
    {
      name: "gg-watchlist-v2",
      version: 1,
    }
  )
);
