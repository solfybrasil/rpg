import React, { memo, useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Search,
  Filter,
  Sparkles,
  Award,
  Edit3,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Globe,
  LayoutGrid,
  List,
} from 'lucide-react';
import type { GrimorioSpell } from '../../grimoire/api';
import {
  useAllHeroSpells,
  useAllSpellsCatalog,
  useEnsinarMagiaMutation,
  useLiberarMagiaMutation,
} from '../api/useDMGrimoire';
import { Button } from '../../../shared/ui';
import { SpellInspectModal } from '../../grimoire/components/SpellInspectModal';
import { DMSpellEditorSheet } from './DMSpellEditorSheet';

const FONTE_CORES: Record<string, string> = {
  Peste: '#5a4670',
  Fogo: '#c85a2b',
  Som: '#4a6f94',
  Sangue: '#8f2934',
  Sombra: '#3a3b45',
  Luz: '#b58e33',
  Arcana: '#357d73',
};

interface DMSpellsCatalogTabProps {
  selectedHeroId: string;
}

export const DMSpellsCatalogTab: React.FC<DMSpellsCatalogTabProps> = memo(({
  selectedHeroId,
}) => {
  const { data: catalog = [], isLoading: isLoadingCatalog } = useAllSpellsCatalog();
  const { data: allHeroSpells = [] } = useAllHeroSpells();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCircle, setFilterCircle] = useState('todos');
  const [filterFonte, setFilterFonte] = useState('todas');
  const [filterRaridade, setFilterRaridade] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [inspectMagia, setInspectMagia] = useState<GrimorioSpell | null>(null);
  const [editingMagia, setEditingMagia] = useState<GrimorioSpell | null>(null);

  const ensinarMutation = useEnsinarMagiaMutation();
  const liberarMutation = useLiberarMagiaMutation();

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

  // Filtered spells
  const filteredSpells = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return catalog.filter((spell) => {
      if (filterCircle !== 'todos' && String(spell.circulo) !== filterCircle) return false;
      if (filterFonte !== 'todas' && spell.fonte !== filterFonte) return false;
      if (filterRaridade !== 'todas' && (spell.raridade || 'Comum') !== filterRaridade) return false;

      const hm = heroProgressionMap.get(Number(spell.id));
      if (filterStatus === 'aprendidas' && !hm?.aprendida) return false;
      if (filterStatus === 'liberadas' && !hm?.liberada_pelo_mestre) return false;
      if (filterStatus === 'nao_aprendidas' && hm?.aprendida) return false;

      if (q) {
        const matchNome = spell.nome?.toLowerCase().includes(q);
        const matchResumo = spell.resumo?.toLowerCase().includes(q);
        const matchEscola = spell.escola?.toLowerCase().includes(q);
        const matchDesc = spell.descricao?.toLowerCase().includes(q);
        if (!matchNome && !matchResumo && !matchEscola && !matchDesc) return false;
      }

      return true;
    });
  }, [catalog, searchTerm, filterCircle, filterFonte, filterRaridade, filterStatus, heroProgressionMap]);

  // Virtualizer for smooth 60fps rendering of ~1.000 items
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredSpells.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 10,
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
            <input
              type="text"
              data-testid="dm-spell-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar entre ~1.000 magias por nome, escola ou efeito..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-xs text-[#f5f0e1] placeholder-white/40 focus:border-[var(--gold)] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Exibição em Grade"
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--gold)] text-black'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Exibição em Tabela"
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[var(--gold)] text-black'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <List size={15} />
              </button>
            </div>

            <span className="text-xs text-white/50 font-serif whitespace-nowrap">
              {filteredSpells.length} de {catalog.length} magias
            </span>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/10">
          {/* Círculo */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-serif text-white/40">Círculo</span>
            <select
              data-testid="dm-spell-circle-select"
              value={filterCircle}
              onChange={(e) => setFilterCircle(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white/90 focus:border-[var(--gold)] focus:outline-none"
            >
              <option value="todos">Todos os Círculos</option>
              <option value="0">Círculo 0 (Truque)</option>
              <option value="1">Círculo 1</option>
              <option value="2">Círculo 2</option>
              <option value="3">Círculo 3</option>
              <option value="4">Círculo 4</option>
              <option value="5">Círculo 5</option>
            </select>
          </div>

          {/* Fonte / Tradição */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-serif text-white/40">Fonte</span>
            <select
              data-testid="dm-spell-school-select"
              value={filterFonte}
              onChange={(e) => setFilterFonte(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white/90 focus:border-[var(--gold)] focus:outline-none"
            >
              <option value="todas">Todas as Fontes</option>
              <option value="Arcana">Arcana</option>
              <option value="Fogo">Fogo</option>
              <option value="Som">Som</option>
              <option value="Peste">Peste</option>
              <option value="Sangue">Sangue</option>
              <option value="Sombra">Sombra</option>
              <option value="Luz">Luz</option>
            </select>
          </div>

          {/* Raridade */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-serif text-white/40">Raridade</span>
            <select
              value={filterRaridade}
              onChange={(e) => setFilterRaridade(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white/90 focus:border-[var(--gold)] focus:outline-none"
            >
              <option value="todas">Todas as Raridades</option>
              <option value="Comum">Comum</option>
              <option value="Incomum">Incomum</option>
              <option value="Raro">Raro</option>
              <option value="Lendário">Lendário</option>
            </select>
          </div>

          {/* Status para Herói */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-serif text-white/40">Status do Herói</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white/90 focus:border-[var(--gold)] focus:outline-none"
            >
              <option value="todas">Qualquer Status</option>
              <option value="nao_aprendidas">Não Aprendidas</option>
              <option value="liberadas">Liberadas no Mundo</option>
              <option value="aprendidas">Já Conhecidas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Virtualized Spells Table/List or Grid */}
      {filteredSpells.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-white/10 text-white/40 text-xs bg-[var(--surface)]">
          Nenhuma magia encontrada com os filtros selecionados.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredSpells.slice(0, 120).map((spell) => {
            const hm = heroProgressionMap.get(Number(spell.id));
            const corEscola = spell.cor || FONTE_CORES[spell.fonte || 'Arcana'] || '#8a6414';
            const isLearned = Boolean(hm?.aprendida);
            const isLiberada = Boolean(hm?.liberada_pelo_mestre);

            return (
              <div
                key={spell.id}
                data-testid={`dm-spell-card-${spell.id}`}
                className="group flex flex-col justify-between rounded-xl border border-white/10 bg-[#161412] p-3 transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/60 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 border text-white shadow-inner"
                      style={{
                        backgroundColor: `${corEscola}33`,
                        borderColor: corEscola,
                      }}
                    >
                      <span className="text-[9px] font-mono leading-none">C</span>
                      <span className="text-xs font-bold leading-none">{spell.circulo}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 justify-end">
                      {spell.revisar_mestre && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                          Arbitragem
                        </span>
                      )}
                      {isLearned && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                          <CheckCircle2 size={10} /> Conhece
                        </span>
                      )}
                    </div>
                  </div>

                  <h4
                    onClick={() => setInspectMagia(spell)}
                    className="font-serif font-bold text-sm text-[#ffd700] hover:underline cursor-pointer line-clamp-1"
                    title={spell.nome}
                  >
                    {spell.nome}
                  </h4>

                  <div className="text-[11px] text-white/50 mt-0.5">
                    {spell.escola || spell.fonte} · {spell.alcance || 'Toque'}
                  </div>

                  {spell.resumo && (
                    <p className="mt-2 text-xs font-serif text-white/60 line-clamp-2 leading-relaxed">
                      {spell.resumo}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setInspectMagia(spell)}
                      title="Ver detalhes da magia"
                      className="p-1.5 rounded-lg text-white/50 hover:text-[var(--gold)] hover:bg-white/5 transition-colors"
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingMagia(spell)}
                      title="Editar fórmula mágica"
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>

                  {!isLearned && (
                    <div className="flex items-center gap-1">
                      {!isLiberada && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          data-testid={`dm-liberate-btn-${spell.id}`}
                          onClick={() => liberarMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id, magiaNome: spell.nome })}
                          className="text-[10px] py-1 px-2 h-auto text-amber-400 hover:bg-amber-950/40"
                        >
                          <Globe size={11} className="mr-1" />
                          Liberar
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        data-testid={`dm-teach-btn-${spell.id}`}
                        onClick={() => ensinarMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id, magiaNome: spell.nome })}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 px-2 h-auto font-serif"
                      >
                        <Sparkles size={11} className="mr-1" />
                        Conceder
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          ref={parentRef}
          data-testid="dm-spells-virtual-container"
          className="overflow-y-auto max-h-[620px] rounded-xl border border-[var(--border)] bg-black/30 pr-1 divide-y divide-white/5"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const spell = filteredSpells[virtualRow.index];
              const hm = heroProgressionMap.get(Number(spell.id));
              const corEscola = spell.cor || FONTE_CORES[spell.fonte || 'Arcana'] || '#8a6414';
              const isLearned = Boolean(hm?.aprendida);
              const isLiberada = Boolean(hm?.liberada_pelo_mestre);

              return (
                <div
                  key={spell.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-white/[0.04] transition-colors box-border"
                >
                  {/* Left: Circle Badge & Name/Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 border shadow-inner text-white"
                      style={{
                        backgroundColor: `${corEscola}33`,
                        borderColor: corEscola,
                      }}
                    >
                      <span className="text-[10px] font-mono leading-none">C</span>
                      <span className="text-xs font-bold leading-none">{spell.circulo}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-xs text-[#ffd700] truncate">
                          {spell.nome}
                        </span>
                        {spell.revisar_mestre && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono shrink-0">
                            Arbitragem
                          </span>
                        )}
                        {isLearned && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono shrink-0 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Conhece
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-white/50 truncate mt-0.5">
                        {spell.escola || spell.fonte} · Foco: {spell.custo_foco ?? 0} · Alcance: {spell.alcance || 'Toque'}
                        {spell.resumo && ` — ${spell.resumo}`}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick DM Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInspectMagia(spell)}
                      title="Ver detalhes da magia"
                      className="p-1.5 rounded-lg text-white/50 hover:text-[var(--gold)] hover:bg-white/5 transition-colors"
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingMagia(spell)}
                      title="Editar fórmula mágica"
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Edit3 size={15} />
                    </button>

                    {!isLearned && (
                      <>
                        {!isLiberada && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            data-testid={`dm-liberate-btn-${spell.id}`}
                            onClick={() => liberarMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id, magiaNome: spell.nome })}
                            className="text-[10px] py-1 px-2 h-auto text-amber-400 hover:bg-amber-950/40"
                          >
                            <Globe size={11} className="mr-1" />
                            Liberar
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          data-testid={`dm-teach-btn-${spell.id}`}
                          onClick={() => ensinarMutation.mutate({ characterId: selectedHeroId, magiaId: spell.id, magiaNome: spell.nome })}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 px-2.5 h-auto font-serif"
                        >
                          <Sparkles size={11} className="mr-1" />
                          Conceder
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectMagia && (
        <SpellInspectModal
          spell={inspectMagia}
          onClose={() => setInspectMagia(null)}
        />
      )}

      {/* Edit Sheet */}
      {editingMagia && (
        <DMSpellEditorSheet
          magia={editingMagia}
          open={Boolean(editingMagia)}
          onOpenChange={(open) => !open && setEditingMagia(null)}
        />
      )}
    </div>
  );
});
