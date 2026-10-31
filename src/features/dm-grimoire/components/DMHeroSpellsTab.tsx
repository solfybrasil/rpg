import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Award,
  Undo2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Shield,
  Layers,
} from 'lucide-react';
import type { GrimorioSpell } from '../../grimoire/api';
import {
  useAllHeroSpells,
  useAllSpellsCatalog,
  useDesfazerMarcaMutation,
  useEnsinarMagiaMutation,
  useLiberarMagiaMutation,
  useRemoverMagiaMutation,
} from '../api/useDMGrimoire';
import { Button } from '../../../shared/ui';
import { SpellInspectModal } from '../../grimoire/components/SpellInspectModal';
import { useHeroes } from '../../../shared/hooks/baseHooks';

const FONTE_CORES: Record<string, string> = {
  Peste: '#5a4670',
  Fogo: '#c85a2b',
  Som: '#4a6f94',
  Sangue: '#8f2934',
  Sombra: '#3a3b45',
  Luz: '#b58e33',
  Arcana: '#357d73',
};

const DEFAULT_HEROES = [
  { id: 'kaelis_moonfire', name: 'Kaelis Moonfire', title: 'Bardo Arcano', icon: '🪕' },
  { id: 'tor_bjorn', name: 'Tor Bjorn', title: 'Artífice Rúnico', icon: '🔨' },
  { id: 'malenia', name: 'Malenia', title: 'Alquimista da Peste', icon: '🧪' },
];

interface DMHeroSpellsTabProps {
  selectedHeroId: string;
  onSelectHeroId: (id: string) => void;
  onOpenCatalogForHero?: () => void;
}

export const DMHeroSpellsTab: React.FC<DMHeroSpellsTabProps> = ({
  selectedHeroId,
  onSelectHeroId,
  onOpenCatalogForHero,
}) => {
  const { data: catalog = [], isLoading: isLoadingCatalog } = useAllSpellsCatalog();
  const { data: allHeroSpells = [], isLoading: isLoadingHeroSpells } = useAllHeroSpells();
  const { heroes: remoteHeroes = [] } = useHeroes();

  const [inspectMagia, setInspectMagia] = useState<GrimorioSpell | null>(null);

  const ensinarMutation = useEnsinarMagiaMutation();
  const liberarMutation = useLiberarMagiaMutation();
  const desfazerMutation = useDesfazerMarcaMutation();
  const removerMutation = useRemoverMagiaMutation();

  // Combine heroes list
  const heroesList = useMemo(() => {
    if (remoteHeroes.length > 0) {
      // Prioritize the 3 canonical characters if present
      const canon = remoteHeroes.filter((h) =>
        ['kaelis_moonfire', 'tor_bjorn', 'malenia'].includes(h.id),
      );
      if (canon.length > 0) return canon;
      return remoteHeroes;
    }
    return DEFAULT_HEROES as any[];
  }, [remoteHeroes]);

  const activeHero = useMemo(() => {
    return heroesList.find((h) => h.id === selectedHeroId) || heroesList[0];
  }, [heroesList, selectedHeroId]);

  // Map of hero's spells
  const heroProgressionMap = useMemo(() => {
    const map = new Map<number | string, any>();
    allHeroSpells
      .filter((hm) => hm.character_id === selectedHeroId)
      .forEach((hm) => {
        map.set(Number(hm.magia_id), hm);
      });
    return map;
  }, [allHeroSpells, selectedHeroId]);

  // Categorize spells
  const { aprendidas, emProgresso } = useMemo(() => {
    const catalogMap = new Map(catalog.map((m) => [Number(m.id), m]));
    const apList: { spell: GrimorioSpell; hm: any }[] = [];
    const progList: { spell: GrimorioSpell; hm: any }[] = [];

    heroProgressionMap.forEach((hm, magiaId) => {
      const spell = hm.magias || catalogMap.get(magiaId);
      if (!spell) return;

      if (hm.aprendida) {
        apList.push({ spell, hm });
      } else if (hm.marcas > 0 || hm.liberada_pelo_mestre) {
        progList.push({ spell, hm });
      }
    });

    apList.sort((a, b) => a.spell.circulo - b.spell.circulo || a.spell.nome.localeCompare(b.spell.nome));
    progList.sort((a, b) => a.spell.circulo - b.spell.circulo || a.spell.nome.localeCompare(b.spell.nome));

    return { aprendidas: apList, emProgresso: progList };
  }, [catalog, heroProgressionMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Selector Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {heroesList.map((hero) => {
          const isSelected = hero.id === selectedHeroId;
          const heroCounts = allHeroSpells.filter((hm) => hm.character_id === hero.id);
          const learnedCount = heroCounts.filter((hm) => hm.aprendida).length;

          return (
            <button
              key={hero.id}
              type="button"
              data-testid={`dm-hero-btn-${hero.id}`}
              onClick={() => onSelectHeroId(hero.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[var(--gold)]/20 via-[var(--surface-raised)] to-[var(--surface)] border-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/50'
                  : 'bg-[var(--surface)] border-[var(--border)] hover:border-white/20 text-white/70'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-black/60 border border-[var(--gold)]/40 flex items-center justify-center text-lg shrink-0 shadow-inner">
                {hero.icon || hero.avatar_icon || '🛡️'}
              </div>
              <div className="min-w-0">
                <div className={`font-serif text-xs font-bold truncate ${isSelected ? 'text-[var(--gold)]' : 'text-[#ebe6d6]'}`}>
                  {hero.name}
                </div>
                <div className="text-[10px] text-white/50 flex items-center gap-2">
                  <span>{hero.title || 'Jurado'}</span>
                  <span className="text-[var(--gold-dim)] font-mono font-bold">
                    ({learnedCount} magias)
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Hero Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--gold)]/20 bg-gradient-to-r from-black/40 to-[var(--surface)]">
        <div>
          <h3 className="font-serif font-bold text-base text-[var(--gold)] flex items-center gap-2">
            <BookOpen size={18} />
            Grimório de {activeHero?.name}
          </h3>
          <p className="text-xs text-white/60 mt-0.5">
            Gerencie o catálogo de fórmulas arcanas, ensine magias sagradas ou reverta nós aprendidos.
          </p>
        </div>

        {onOpenCatalogForHero && (
          <Button
            type="button"
            data-testid="dm-open-catalog-for-hero-btn"
            variant="primary"
            onClick={onOpenCatalogForHero}
            className="bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-serif font-bold text-xs"
          >
            <Plus size={14} className="mr-1.5" />
            Conceder Magia do Catálogo
          </Button>
        )}
      </div>

      {/* Grid of Sections: Aprendidas & Em Progresso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seção 1: Magias Aprendidas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="font-serif font-bold text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Magias Aprendidas ({aprendidas.length})
            </h4>
            <span className="text-[11px] text-white/40">Conhecidas pelo jurado</span>
          </div>

          {aprendidas.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-white/40 text-xs">
              Nenhuma magia aprendida ainda por este herói.
            </div>
          ) : (
            <div className="space-y-2">
              {aprendidas.map(({ spell, hm }) => {
                const corEscola = spell.cor || FONTE_CORES[spell.fonte || 'Arcana'] || '#8a6414';
                return (
                  <div
                    key={spell.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-2 hover:border-white/20 transition-all shadow-sm"
                    style={{ borderLeftColor: corEscola, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-serif font-bold text-xs text-[#ffd700]">
                          {spell.nome}
                        </div>
                        <div className="text-[10px] text-white/50 mt-0.5">
                          Círculo {spell.circulo} · {spell.escola || spell.fonte} · Foco: {spell.custo_foco ?? 0}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setInspectMagia(spell)}
                          title="Inspecionar magia"
                          className="p-1 rounded text-white/50 hover:text-[var(--gold)] hover:bg-white/5 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          data-testid={`dm-undo-spell-${spell.id}`}
                          onClick={() => desfazerMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id })}
                          title="Desfazer 1 marca / Reverter aprendizado"
                          className="p-1 rounded text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/40 transition-colors"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button
                          type="button"
                          data-testid={`dm-remove-spell-${spell.id}`}
                          onClick={() => {
                            if (window.confirm(`Remover "${spell.nome}" completamente do grimório de ${activeHero?.name}?`)) {
                              removerMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id, magiaNome: spell.nome });
                            }
                          }}
                          title="Remover completamente"
                          className="p-1 rounded text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {spell.resumo && (
                      <p className="text-[11px] text-white/70 line-clamp-2">
                        {spell.resumo}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Seção 2: Em Progresso & Liberadas pelo Mestre */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="font-serif font-bold text-sm text-amber-400 flex items-center gap-2">
              <Sparkles size={16} />
              Em Estudo & Liberadas ({emProgresso.length})
            </h4>
            <span className="text-[11px] text-white/40">Marcas ou estudo pendente</span>
          </div>

          {emProgresso.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-white/40 text-xs">
              Nenhuma magia em processo de estudo no momento.
            </div>
          ) : (
            <div className="space-y-2">
              {emProgresso.map(({ spell, hm }) => {
                const corEscola = spell.cor || FONTE_CORES[spell.fonte || 'Arcana'] || '#8a6414';
                return (
                  <div
                    key={spell.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-2 hover:border-white/20 transition-all shadow-sm"
                    style={{ borderLeftColor: corEscola, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-serif font-bold text-xs text-[#ffd700]">
                          {spell.nome}
                        </div>
                        <div className="text-[10px] text-white/50 mt-0.5">
                          Círculo {spell.circulo} · {spell.escola || spell.fonte} · Marcas: {hm.marcas || 0}/{spell.custo_inspiracao || 1}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectMagia(spell)}
                          title="Inspecionar magia"
                          className="p-1 rounded text-white/50 hover:text-[var(--gold)] hover:bg-white/5 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          data-testid={`dm-teach-now-${spell.id}`}
                          onClick={() => ensinarMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id, magiaNome: spell.nome })}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 px-2 h-auto"
                        >
                          Conceder Agora
                        </Button>
                        <button
                          type="button"
                          onClick={() => desfazerMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id })}
                          title="Desfazer 1 marca"
                          className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remover "${spell.nome}" de ${activeHero?.name}?`)) {
                              removerMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id, magiaNome: spell.nome });
                            }
                          }}
                          title="Remover"
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {spell.resumo && (
                      <p className="text-[11px] text-white/70 line-clamp-2">
                        {spell.resumo}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Spell Inspect Modal */}
      {inspectMagia && (
        <SpellInspectModal
          spell={inspectMagia}
          onClose={() => setInspectMagia(null)}
        />
      )}
    </div>
  );
};
