import {
  BookOpen,
  Flame,
  Hammer,
  Sparkles,
  Store,
  Utensils,
} from 'lucide-react';
import React, { memo, useState } from 'react';
import { useGameState } from '../../../shared/hooks/baseHooks';
import { DMShopControlTab } from '../../shop/components/DMShopControlTab.tsx';
import { DMRecipesTab } from './DMRecipesTab.tsx';
import { DMWorkshopControlTab } from './DMWorkshopControlTab.tsx';

export type WorkshopHubTab = 'oficina' | 'receitas' | 'loja';

export const DMWorkshopHubView: React.FC = memo(() => {
  const [activeTab, setActiveTab] = useState<WorkshopHubTab>('oficina');
  const { gameState } = useGameState();

  const forgeAvailable = Boolean(gameState?.forge_available);
  const alchemyAvailable = gameState?.descanso_evento !== 'alchemy_closed';
  const shopOpen = Boolean(gameState?.shop_open);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5b65b]/40 bg-[#f5b65b]/10 text-[#f5b65b] shadow-[0_0_15px_rgba(245,182,91,0.2)]">
            <Hammer className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#ebe6d6]">
              Oficina, Receitas & Mercado
            </h1>
            <p className="font-serif text-xs text-white/50">
              Controle de bancadas arcanas, forja de fórmulas 3x3 e suprimento de artigos mercantis.
            </p>
          </div>
        </div>

        {/* Global status pills */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border transition-colors ${
              forgeAvailable
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-white/10 bg-black/40 text-white/40'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                forgeAvailable ? 'bg-amber-400 animate-pulse' : 'bg-neutral-600'
              }`}
            />
            <span>Forja</span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border transition-colors ${
              alchemyAvailable
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-black/40 text-white/40'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                alchemyAvailable ? 'bg-emerald-400' : 'bg-neutral-600'
              }`}
            />
            <span>Alquimia</span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border transition-colors ${
              shopOpen
                ? 'border-[#f5b65b]/40 bg-[#f5b65b]/10 text-[#f5b65b]'
                : 'border-white/10 bg-black/40 text-white/40'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                shopOpen ? 'bg-[#f5b65b]' : 'bg-neutral-600'
              }`}
            />
            <span>Loja</span>
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center rounded-xl border border-white/10 bg-[#121215]/80 p-1 w-full sm:w-auto self-start shadow-md">
        <button
          type="button"
          data-testid="tab-oficina"
          onClick={() => setActiveTab('oficina')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-serif font-bold transition-all ${
            activeTab === 'oficina'
              ? 'bg-[#f5b65b] text-black shadow-sm'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Hammer className="h-4 w-4" />
          <span>Bancadas & Controle</span>
        </button>

        <button
          type="button"
          data-testid="tab-receitas"
          onClick={() => setActiveTab('receitas')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-serif font-bold transition-all ${
            activeTab === 'receitas'
              ? 'bg-[#f5b65b] text-black shadow-sm'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Receitas 3x3</span>
        </button>

        <button
          type="button"
          data-testid="tab-loja"
          onClick={() => setActiveTab('loja')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-serif font-bold transition-all ${
            activeTab === 'loja'
              ? 'bg-[#f5b65b] text-black shadow-sm'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Mercado & Loja</span>
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'oficina' && <DMWorkshopControlTab />}
      {activeTab === 'receitas' && <DMRecipesTab />}
      {activeTab === 'loja' && <DMShopControlTab />}
    </div>
  );
});
