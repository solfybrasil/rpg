import React, { memo, useMemo, useState } from 'react';
import {
  BookOpen,
  Sparkles,
  AlertTriangle,
  Award,
  Shield,
  Layers,
} from 'lucide-react';
import { DMHeroSpellsTab } from './DMHeroSpellsTab';
import { DMSpellsCatalogTab } from './DMSpellsCatalogTab';
import { DMArbitrationTab } from './DMArbitrationTab';
import { DMOathTreeTab } from './DMOathTreeTab';
import { useAllSpellsCatalog } from '../api/useDMGrimoire';

type DMSubTab = 'grimorio' | 'catalogo' | 'provacoes' | 'arvores';

export const DMGrimoireHubView: React.FC = memo(() => {
  const [activeTab, setActiveTab] = useState<DMSubTab>('grimorio');
  const [selectedHeroId, setSelectedHeroId] = useState<string>('kaelis_moonfire');

  const { data: catalog = [] } = useAllSpellsCatalog();

  // Pending count for arbitration badge (memoizado para evitar re-scan de 1000 magias)
  const pendingArbitrationCount = useMemo(() => {
    return catalog.filter(
      (s) =>
        Boolean(s.revisar_mestre) ||
        (Array.isArray(s.efeitos) && s.efeitos.some((e: any) => e.bloco === 'narrativo')),
    ).length;
  }, [catalog]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-1)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-widest text-[var(--gold-dim)]">
            <Shield size={14} />
            Módulo do Mestre · Grimórios & Progressão
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[var(--text-1)] mt-1">
            Grimórios, Provações & Árvores
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-2xl mt-1 leading-relaxed">
            Controle de magias aprendidas pelos heróis, catálogo virtualizado com ~1.000 fórmulas arcanas, fila de deliberação de provações e gestão dos nós da Árvore do Juramento.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          data-testid="dm-tab-grimorio"
          onClick={() => setActiveTab('grimorio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'grimorio'
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen size={16} />
          Grimório dos Heróis
        </button>

        <button
          type="button"
          data-testid="dm-tab-catalogo"
          onClick={() => setActiveTab('catalogo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'catalogo'
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles size={16} />
          Catálogo Motor (~1.000)
        </button>

        <button
          type="button"
          data-testid="dm-tab-provacoes"
          onClick={() => setActiveTab('provacoes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'provacoes'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={16} />
          Provações & Arbitragem
          {pendingArbitrationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {pendingArbitrationCount}
            </span>
          )}
        </button>

        <button
          type="button"
          data-testid="dm-tab-arvores"
          onClick={() => setActiveTab('arvores')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'arvores'
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Award size={16} />
          Árvores do Juramento
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'grimorio' && (
          <DMHeroSpellsTab
            selectedHeroId={selectedHeroId}
            onSelectHeroId={setSelectedHeroId}
            onOpenCatalogForHero={() => setActiveTab('catalogo')}
          />
        )}

        {activeTab === 'catalogo' && (
          <DMSpellsCatalogTab selectedHeroId={selectedHeroId} />
        )}

        {activeTab === 'provacoes' && <DMArbitrationTab />}

        {activeTab === 'arvores' && (
          <DMOathTreeTab
            selectedHeroId={selectedHeroId}
            onSelectHeroId={setSelectedHeroId}
          />
        )}
      </div>
    </div>
  );
});
