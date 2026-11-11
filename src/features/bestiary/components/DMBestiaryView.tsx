import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Film, Flame, LayoutGrid, List, Plus, Shield, Skull, Sparkles, Sword } from 'lucide-react';
import React, { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { applyOwnerMedia, pickTokenMedia } from '../../battle-map/api/battleApi.ts';
import { MediaBattleModal, type MediaBattleResult } from '../../battle-map/components/MediaBattleModal.tsx';
import { isVideoUrl, splitMediaUrl, withMediaParams } from '../../battle-map/engine/mediaParams.ts';
import { creatureMediaFields } from '../api/creatureMedia.ts';
import {
  archiveCreature,
  createCreature,
  saveCreatureBattleMedia,
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
import { DMPageHeader, DM_PAGE_CLASS } from '../../../shared/ui/DMPage';

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
  const [mediaCreature, setMediaCreature] = useState<Creature | null>(null);

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
    setMediaCreature(creature);
  }, []);

  /** Grava a mídia da fera no catálogo e nas peças dela que já estão nas mesas. */
  const handleSaveMedia = useCallback(
    async (r: MediaBattleResult) => {
      const creature = mediaCreature;
      if (!creature) return;
      const { url: main, brightness } = splitMediaUrl(r.media_url);
      const image = r.poster_url || (isVideoUrl(main) ? null : main) || creature.image_url || null;
      const image_url = await saveCreatureBattleMedia(creature.id, {
        image,
        mp4: r.idle_mp4_url,
        webm: r.idle_webm_url,
        chroma: r.chroma,
        anchorX: r.anchor_x,
        anchorY: r.anchor_y,
        size: r.size,
        facing: r.facing,
        brightness,
      });
      await applyOwnerMedia({ beastId: creature.id }, pickTokenMedia(r as unknown as Record<string, unknown>)).catch(() => {});
      const fields = creatureMediaFields({ ...creature, image_url });
      setSelectedCreature((prev) => (prev && prev.id === creature.id ? { ...prev, ...fields } : prev));
      queryClient.invalidateQueries({ queryKey: ['creatures_catalog'] });
    },
    [mediaCreature, queryClient],
  );

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
    <div className={DM_PAGE_CLASS}>
      <DMPageHeader
        title="Bestiário"
        subtitle={`${totalCount} ${totalCount === 1 ? 'criatura' : 'criaturas'} no catálogo`}
        actions={
          <div className="flex items-center border border-[var(--iron)] bg-[var(--stone)]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Exibição em Grade"
              className={`p-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--stone-2)] text-[var(--gold-hi)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Exibição em Lista"
              className={`p-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--stone-2)] text-[var(--gold-hi)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        }
      />

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
      {mediaCreature && (
        <MediaBattleModal
          key={mediaCreature.id}
          target={{
            ownerId: mediaCreature.id,
            name: mediaCreature.name,
            kind: 'fera',
            media_url: withMediaParams(
              mediaCreature.idle_mp4_url || mediaCreature.idle_webm_url || mediaCreature.image_url || '',
              { brightness: (mediaCreature as { media_brightness?: number }).media_brightness ?? 1 },
            ),
            poster_url: mediaCreature.poster_url || mediaCreature.image_url,
            idle_mp4_url: mediaCreature.idle_mp4_url,
            idle_webm_url: mediaCreature.idle_webm_url,
            chroma: mediaCreature.media_chroma,
            anchor_x: mediaCreature.media_anchor_x,
            anchor_y: mediaCreature.media_anchor_y,
            size: mediaCreature.media_size,
            facing: mediaCreature.media_facing,
          }}
          onSave={handleSaveMedia}
          onClose={() => setMediaCreature(null)}
        />
      )}
    </div>
  );
});
