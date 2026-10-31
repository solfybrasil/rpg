import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  Edit3,
  Search,
  Sparkles,
  Scroll,
  Shield,
  Layers,
} from 'lucide-react';
import type { GrimorioSpell } from '../../grimoire/api';
import {
  useAllSpellsCatalog,
  useAlternarRevisaoMutation,
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

export const DMArbitrationTab: React.FC = () => {
  const { data: catalog = [] } = useAllSpellsCatalog();
  const [searchRevisar, setSearchRevisar] = useState('');
  const [filterType, setFilterType] = useState<'todas' | 'revisar_mestre' | 'narrativo'>('todas');

  const [inspectMagia, setInspectMagia] = useState<GrimorioSpell | null>(null);
  const [editingMagia, setEditingMagia] = useState<GrimorioSpell | null>(null);

  const alternarRevisaoMutation = useAlternarRevisaoMutation();

  // All spells needing review or narrative blocks
  const { revisarMestreList, narrativoList, allArbitration } = useMemo(() => {
    const rev: GrimorioSpell[] = [];
    const narr: GrimorioSpell[] = [];
    const allSet = new Set<GrimorioSpell>();

    for (const mag of catalog) {
      const hasRevisar = Boolean(mag.revisar_mestre);
      const hasNarrativo =
        Array.isArray(mag.efeitos) &&
        mag.efeitos.some((e: any) => e.bloco === 'narrativo' || e.tipo === 'narrativo');

      if (hasRevisar) {
        rev.push(mag);
        allSet.add(mag);
      }
      if (hasNarrativo) {
        narr.push(mag);
        allSet.add(mag);
      }
    }

    return {
      revisarMestreList: rev,
      narrativoList: narr,
      allArbitration: Array.from(allSet),
    };
  }, [catalog]);

  // Filtered list
  const filteredMagias = useMemo(() => {
    const q = searchRevisar.trim().toLowerCase();

    return allArbitration.filter((mag) => {
      const hasRevisar = Boolean(mag.revisar_mestre);
      const hasNarrativo =
        Array.isArray(mag.efeitos) &&
        mag.efeitos.some((e: any) => e.bloco === 'narrativo' || e.tipo === 'narrativo');

      if (filterType === 'revisar_mestre' && !hasRevisar) return false;
      if (filterType === 'narrativo' && !hasNarrativo) return false;

      if (q) {
        const matchNome = mag.nome?.toLowerCase().includes(q);
        const matchEscola = mag.escola?.toLowerCase().includes(q);
        const matchResumo = mag.resumo?.toLowerCase().includes(q);
        const matchDesc = mag.descricao?.toLowerCase().includes(q);
        if (!matchNome && !matchEscola && !matchResumo && !matchDesc) return false;
      }

      return true;
    });
  }, [allArbitration, searchRevisar, filterType]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner Explicativo de Arbitragem */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-black/40 to-black/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-sm text-amber-400 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            Fila de Arbitragem & Provações do Confessor
          </h3>
          <p className="text-xs text-[#e5d5be]/80 mt-1 max-w-2xl leading-relaxed">
            Estas magias possuem a flag <strong>revisar_mestre</strong> ou blocos de efeito{' '}
            <strong>narrativo</strong> que exigem deliberação do Mestre (ex: custos dramáticos,
            interações com cenário, testes especiais ou mecânicas livres). Você pode homologá-las para jogo ou ajustar seus efeitos diretamente.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            data-testid="dm-arbitration-filter-all"
            onClick={() => setFilterType('todas')}
            className={`px-3 py-1.5 rounded-full text-xs font-serif font-bold border transition-colors ${
              filterType === 'todas'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            Todas ({allArbitration.length})
          </button>

          <button
            type="button"
            data-testid="dm-arbitration-filter-flag"
            onClick={() => setFilterType('revisar_mestre')}
            className={`px-3 py-1.5 rounded-full text-xs font-serif font-bold border transition-colors ${
              filterType === 'revisar_mestre'
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            ⚠️ Flag revisar_mestre ({revisarMestreList.length})
          </button>

          <button
            type="button"
            data-testid="dm-arbitration-filter-narrative"
            onClick={() => setFilterType('narrativo')}
            className={`px-3 py-1.5 rounded-full text-xs font-serif font-bold border transition-colors ${
              filterType === 'narrativo'
                ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            📜 Narrativo ({narrativoList.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
        />
        <input
          type="text"
          data-testid="dm-arbitration-search-input"
          value={searchRevisar}
          onChange={(e) => setSearchRevisar(e.target.value)}
          placeholder="Buscar por nome, escola ou trecho da regra a revisar..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[#f5f0e1] placeholder-white/40 focus:border-amber-400 focus:outline-none transition-colors"
        />
      </div>

      {/* Grid of Pending Spells */}
      {filteredMagias.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-white/10 text-white/40 text-xs bg-[var(--surface)]">
          Nenhuma magia pendente encontrada para este filtro. Todas as deliberações estão em dia!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMagias.map((mag) => {
            const corEscola = mag.cor || FONTE_CORES[mag.fonte || 'Arcana'] || '#8a6414';
            const temNarrativo = (mag.efeitos || []).some(
              (e: any) => e.bloco === 'narrativo' || e.tipo === 'narrativo',
            );

            return (
              <div
                key={mag.id}
                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-3 shadow-md hover:border-white/20 transition-all"
                style={{ borderLeftColor: corEscola, borderLeftWidth: 4 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#ffd700] leading-snug">
                      {mag.nome}
                    </h4>
                    <div className="text-[10px] text-white/50 mt-0.5">
                      Círculo {mag.circulo} · {mag.escola || mag.fonte} · Foco: {mag.custo_foco ?? 0}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {mag.revisar_mestre && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        ⚠️ Revisar Mestre
                      </span>
                    )}
                    {temNarrativo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        📜 Narrativo
                      </span>
                    )}
                  </div>
                </div>

                {/* Resumo */}
                <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">
                  {mag.resumo || mag.descricao}
                </p>

                {/* Efeito Pills */}
                {Array.isArray(mag.efeitos) && mag.efeitos.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {mag.efeitos.slice(0, 3).map((ef: any, idx: number) => {
                      const bTipo = ef.bloco || ef.tipo || 'efeito';
                      return (
                        <span
                          key={idx}
                          className={`text-[9px] px-2 py-0.5 rounded border font-mono ${
                            bTipo === 'narrativo'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-white/5 text-white/60 border-white/10'
                          }`}
                        >
                          {bTipo}: {String(ef.valor || ef.condicao || ef.texto || 'ativo').slice(0, 18)}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-white/10">
                  <button
                    type="button"
                    data-testid={`dm-toggle-review-${mag.id}`}
                    onClick={() =>
                      alternarRevisaoMutation.mutate({
                        magiaId: mag.id,
                        novoValor: !mag.revisar_mestre,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-serif font-bold border transition-colors cursor-pointer ${
                      mag.revisar_mestre
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                    }`}
                  >
                    {mag.revisar_mestre ? <Check size={13} /> : <AlertTriangle size={13} />}
                    {mag.revisar_mestre ? 'Homologar' : 'Marcar Revisão'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInspectMagia(mag)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-serif border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Eye size={13} className="inline mr-1" />
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMagia(mag)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-serif border border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
                    >
                      <Edit3 size={13} className="inline mr-1" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
};
