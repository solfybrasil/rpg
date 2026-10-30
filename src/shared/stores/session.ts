import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'mestre' | 'jogador' | 'tv';

export interface SessionState {
  role: UserRole | null;
  heroId: string | null;
  setRole: (role: UserRole | null) => void;
  setHeroId: (heroId: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      heroId: null,
      setRole: (role) => set({ role }),
      setHeroId: (heroId) => set({ heroId }),
      clearSession: () => set({ role: null, heroId: null }),
    }),
    {
      name: 'peste_session',
      partialize: (state) => ({ role: state.role, heroId: state.heroId }),
    },
  ),
);
