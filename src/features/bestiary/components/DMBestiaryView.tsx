import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Film, Flame, LayoutGrid, List, Plus, Shield, Skull, Sparkles, Sword } from 'lucide-react';
import React, { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { MediaBattleModal, type MediaBattleTarget } from '../../battle-map/components/MediaBattleModal.tsx';
import {
  archiveCreature,
  createCreature,
  sendCreatureToBattle,
  sendCreatureToTable,
  updateCreature,
  useCreaturesCatalog,
} from '../api/index.ts';
import type { Creature, CreatureFilter } from '../api/types.ts';
import { BestiaryCardGrid } from './BestiaryCardGrid.tsx';
import { BestiaryFilterBar } from './BestiaryFilterBar.tsx';
import { BestiaryTableView } from './BestiaryTableView.tsx';
import { CreatureDetailSheet } from './CreatureDetailSheet.tsx';
import { CreatureFormModal } from './CreatureFormModal.tsx';

export const DMBestiaryView: React.FC = memo(() => {
  const queryClient = useQueryClient();

  // Filters State
  const [filter, setFilter] = useState<CreatureFilter>({
    page: 1,
    pageSize: 30,
    search: '',
  });

  // View mode: default to grid
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Query Catalog
  const { data, isLoading, isError, error } = useCreaturesCatalog(filter);

  // Modals / Sheet States
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [creatureToEdit, setCreatureToEdit] = useState<Creature | null>(null);
  const [mediaTarget, setMediaTarget] = useState<MediaBattleTarget | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // Filter Handlers
  const handleFilterChange = useCallback((updates: Partial<CreatureFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilter({
      page: 1,
      pageSize: 30,
      search: '',
      region: undefined,
      category: undefined,
      tier: undefined,
      threatMin: undefined,
      threatMax: undefined,
    });
  }, []);

  // Actions
  const handleSendToTable = useCallback(async (creature: Creature) => {
    try {
      await sendCreatureToTable(creature);
      toast.success(`Token de "${creature.name}" colocado na Mesa de Batalha!`, {
        description: `Posicionado na mesa ativa com ${creature.max_hp} PV e Defesa ${creature.defense}.`,
      });
    } catch (err: any) {
      toast.error(`Falha ao colocar na mesa: ${err.message || 'Erro desconhecido'}`);
    }
  }, []);

  const handleSendToBattle = useCallback(async (creature: Creature) => {
    try {
      const res = await sendCreatureToBattle(creature, 1);
      toast.success(`"${creature.name}" adicionado ao combate ativo!`, {
        description: `Encontro ${res.encounterId || 'atual'}: ${creature.max_hp} PV, Ataque +${creature.attack_bonus} (${creature.damage_dice}).`,
      });
    } catch (err: any) {
      toast.error(`Falha ao adicionar ao combate: ${err.message || 'Erro desconhecido'}`);
    }
  }, []);

  const handleOpenMedia = useCallback((creature: Creature) => {
    const target: MediaBattleTarget = {
      id: creature.id,
      name: creature.name,
      kind: 'fera',
      image_url: creature.image_url,
      poster_url: creature.poster_url || creature.image_url,
      idle_mp4_url: creature.idle_mp4_url,
      idle_webm_url: creature.idle_webm_url,
      media_chroma: creature.media_chroma,
      media_anchor_x: creature.media_anchor_x,
      media_anchor_y: creature.media_anchor_y,
      media_size: creature.media_size,
      media_facing: creature.media_facing,
    };
    setMediaTarget(target);
    setMediaModalOpen(true);
  }, []);

  const handleMediaSaved = useCallback((updatedTarget: MediaBattleTarget) => {
    setSelectedCreature((prev) =>
      prev && prev.id === updatedTarget.id
        ? {
            ...prev,
            idle_mp4_url: updatedTarget.idle_mp4_url,
            idle_webm_url: updatedTarget.idle_webm_url,
            poster_url: updatedTarget.poster_url,
            media_chroma: updatedTarget.media_chroma as string,
            media_anchor_x: updatedTarget.media_anchor_x,
            media_anchor_y: updatedTarget.media_anchor_y,
            media_size: updatedTarget.media_size,
            media_facing: updatedTarget.media_facing,
          }
        : prev,
    );
    queryClient.invalidateQueries({ queryKey: ['creatures_catalog'] });
  }, [queryClient]);

  const handleCreateNew = useCallback(() => {
    setCreatureToEdit(null);
    setFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((creature: Creature) => {
    setCreatureToEdit(creature);
    setFormModalOpen(true);
  }, []);

  const handleArchive = async (creature: Creature) => {
    if (
      !window.confirm(
        `Tem certeza que deseja arquivar "${creature.name}" do catálogo ativo?`,
      )
    ) {
      return;
    }

    try {
      await archiveCreature(creature.id, true);
      toast.success(`"${creature.name}" arquivado com sucesso.`);
      if (selectedCreature?.id === creature.id) {
        setSelectedCreature(null);
      }
      queryClient.invalidateQueries({ queryKey: ['creatures_catalog'] });
    } catch (err: any) {
      toast.error(`Falha ao arquivar criatura: ${err.message || 'Erro'}`);
    }
  };

  const handleSaveCreature = async (creatureData: Partial<Creature>) => {
    try {
      if (creatureToEdit) {
        const updated = await updateCreature(creatureToEdit.id, creatureData);
        toast.success(`Fera "${updated.name}" atualizada com sucesso!`);
        if (selectedCreature?.id === updated.id) {
          setSelectedCreature(updated);
        }
      } else {
        const created = await createCreature(creatureData);
        toast.success(`Fera "${created.name}" registrada no bestiário!`);
      }
      queryClient.invalidateQueries({ queryKey: ['creatures_catalog'] });
    } catch (err: any) {
      toast.error(`Falha ao salvar criatura: ${err.message || 'Erro'}`);
      throw err;
    }
  };

  const creatures = data?.data || [];
  const totalCount = data?.total || 0;
  const page = data?.page || 1;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-[#08080a] text-[#ebe6d6] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Skull className="h-6 w-6 text-[#f5b65b]" />
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-tight text-[#f5b65b] uppercase">
              Bestiário de Aldrenor
            </h1>
          </div>
          <p className="font-serif italic text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
            Catálogo completo de feras, horrores da peste e abominações. Busca veloz no servidor,
            ficha tática em gaveta lateral, integração de vídeo idle e envio direto para a mesa.
          </p>
        </div>

        {/* Quick Stats & View Mode Toggle */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center rounded-xl border border-[#423326] bg-[#14110e] p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Exibição em Grade"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#c5a36a] text-[#100e0c]'
                  : 'text-[#a99a82] hover:text-[#e2d5bd]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Exibição em Lista"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#c5a36a] text-[#100e0c]'
                  : 'text-[#a99a82] hover:text-[#e2d5bd]'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#191512] border border-[#423326] rounded-xl px-3 py-1.5 text-xs font-mono text-[#a99a82]">
            <BookOpen className="h-3.5 w-3.5 text-[#c5a36a]" />
            <span><strong className="text-[#e4c894]">{totalCount}</strong> criaturas</span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <BestiaryFilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onCreateNew={handleCreateNew}
        totalCount={totalCount}
      />

      {/* Main View: Grid by default, Table on toggle */}
      <main>
        {isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-200">
            <p className="font-semibold text-sm">Erro ao carregar bestiário</p>
            <p className="text-xs text-red-300/80 mt-1">{(error as any)?.message || 'Erro de conexão'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <BestiaryCardGrid
            creatures={creatures}
            totalCount={totalCount}
            page={page}
            totalPages={totalPages}
            onPageChange={(newPage) => handleFilterChange({ page: newPage })}
            onSelectCreature={(c) => setSelectedCreature(c)}
            onEditCreature={(c) => handleEdit(c)}
            onSendToTable={handleSendToTable}
            onSendToBattle={handleSendToBattle}
            onOpenMedia={handleOpenMedia}
            isLoading={isLoading}
          />
        ) : (
          <BestiaryTableView
            creatures={creatures}
            totalCount={totalCount}
            page={page}
            totalPages={totalPages}
            onPageChange={(newPage) => handleFilterChange({ page: newPage })}
            onSelectCreature={(c) => setSelectedCreature(c)}
            onSendToTable={handleSendToTable}
            onSendToBattle={handleSendToBattle}
            onOpenMedia={handleOpenMedia}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Wide Sheet for Detailed Creature Sheet */}
      <CreatureDetailSheet
        creature={selectedCreature}
        open={!!selectedCreature}
        onOpenChange={(isOpen) => !isOpen && setSelectedCreature(null)}
        onSendToTable={handleSendToTable}
        onSendToBattle={handleSendToBattle}
        onOpenMedia={handleOpenMedia}
        onEdit={handleEdit}
        onArchive={handleArchive}
      />

      {/* Form Modal for Create / Edit */}
      <CreatureFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        creature={creatureToEdit}
        onSave={handleSaveCreature}
      />

      {/* Media Battle Modal (Prompt 06 Integration) */}
      <MediaBattleModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        targetType="fera"
        targetData={mediaTarget}
        onMediaSaved={handleMediaSaved}
      />
    </div>
  );
});
