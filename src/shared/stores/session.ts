import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'mestre' | 'jogador' | 'tv';

export interface SessionState {
  role: UserRole | null;
  heroId: string | null;
  setRole: (role: UserRole | null) => void;
  setHeroId: (heroId: string | null) => void;
  selectHero: (heroId: string) => void;
  enterAsDM: () => void;
  enterAsTv: () => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      heroId: null,
      setRole: (role) => set({ role }),
      setHeroId: (heroId) => set({ heroId }),
      selectHero: (heroId) => set({ role: 'jogador', heroId }),
      enterAsDM: () => set({ role: 'mestre', heroId: null }),
      enterAsTv: () => set({ role: 'tv', heroId: null }),
      clearSession: () => set({ role: null, heroId: null }),
    }),
    {
      name: 'peste_session',
      partialize: (state) => ({ role: state.role, heroId: state.heroId }),
    },
  ),
);
