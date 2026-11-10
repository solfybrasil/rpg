import { useQueryClient } from '@tanstack/react-query';
import { Download, Package, Plus, Sparkles } from 'lucide-react';
import React, { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  archiveCatalogItem,
  useCatalogItems,
} from '../api/index.ts';
import type { ItemCatalog, ItemCatalogFilter } from '../api/types.ts';
import { GiveItemSelectorModal } from './GiveItemSelectorModal.tsx';
import { ItemCatalogCardGrid } from './ItemCatalogCardGrid.tsx';
import { ItemCatalogFilterBar } from './ItemCatalogFilterBar.tsx';
import { ItemCatalogTableView } from './ItemCatalogTableView.tsx';
import { ItemFormSheet } from './ItemFormSheet.tsx';
import { DMPageHeader, DM_PAGE_CLASS } from '../../../shared/ui/DMPage';
import { AiImagesPanel } from '../../market/components/AiImagesPanel.tsx';

export function exportItemsToCSV(items: ItemCatalog[]): void {
  if (!items || items.length === 0) {
    toast.error('Nenhum artigo disponível para exportação');
    return;
  }

  const headers = [
    'ID',
    'Nome',
    'Categoria',
    'Subcategoria',
    'Raridade',
    'Preço (Bronze)',
    'Dado de Dano',
    'Bônus de Armadura',
    'Bônus de Ataque',
    'Durabilidade',
    'Máx Durabilidade',
    'Tipo de Desgaste',
    'Especial',
    'Descrição',
    'URL da Imagem',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map((it) => [
    escapeCSV(it.id),
    escapeCSV(it.name),
    escapeCSV(it.category),
    escapeCSV(it.subcategory || ''),
    escapeCSV(it.rarity || 'Comum'),
    escapeCSV(it.price_bronze || 0),
    escapeCSV(it.damage_dice || ''),
    escapeCSV(it.armor_bonus || 0),
    escapeCSV(it.attack_bonus || 0),
    escapeCSV(it.durability ?? ''),
    escapeCSV(it.max_durability ?? ''),
    escapeCSV(it.wear_type || ''),
    escapeCSV(it.special || ''),
    escapeCSV(it.description || ''),
    escapeCSV(it.image_url || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `catalogo_aldrenor_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Exportados ${items.length} artigos para CSV com sucesso!`);
}

export const DMItemCatalogView: React.FC = memo(() => {
  const queryClient = useQueryClient();

  // Filters state
  const [filter, setFilter] = useState<ItemCatalogFilter>({
    page: 1,
    pageSize: 40,
    search: '',
  });

  // Dual view mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals / Sheets state
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemCatalog | null>(null);
  const [giveModalOpen, setGiveModalOpen] = useState(false);
  const [itemToGive, setItemToGive] = useState<ItemCatalog | null>(null);

  // TanStack Query
  const { data, isLoading, isError, error } = useCatalogItems(filter);

  const items = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const currentPage = filter.page || 1;

  const handleFilterChange = useCallback((updates: Partial<ItemCatalogFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilter({
      page: 1,
      pageSize: 40,
      search: '',
      category: undefined,
      rarity: undefined,
      sortBy: 'name',
    });
  }, []);

  const handleCreateNew = useCallback(() => {
    setItemToEdit(null);
    setFormSheetOpen(true);
  }, []);

  const handleEditItem = useCallback((item: ItemCatalog) => {
    setItemToEdit(item);
    setFormSheetOpen(true);
  }, []);

  const handleSelectItem = useCallback((item: ItemCatalog) => {
    // Abre a visualização em sheet com prévia e detalhes
    setItemToEdit(item);
    setFormSheetOpen(true);
  }, []);

  const handleGiveItem = useCallback((item: ItemCatalog) => {
    setItemToGive(item);
    setGiveModalOpen(true);
  }, []);

  const handleArchiveItem = useCallback(async (item: ItemCatalog) => {
    const nextArchived = !item.archived;
    const actionLabel = nextArchived ? 'arquivar' : 'desarquivar';

    if (!window.confirm(`Deseja realmente ${actionLabel} o artigo "${item.name}"?`)) {
      return;
    }

    try {
      await archiveCatalogItem(item.id, nextArchived);
      toast.success(
        nextArchived
          ? `Artigo "${item.name}" arquivado.`
          : `Artigo "${item.name}" restaurado ao catálogo ativo.`,
      );
      queryClient.invalidateQueries({ queryKey: ['item_catalog'] });
    } catch (err: any) {
      toast.error(`Falha ao alterar arquivamento: ${err.message}`);
    }
  }, [queryClient]);

  const handleExportCSV = () => {
    exportItemsToCSV(items);
  };

  return (
    <div className={DM_PAGE_CLASS}>
      <DMPageHeader
        title="Itens"
        subtitle={`${totalCount} ${totalCount === 1 ? 'item' : 'itens'} no catálogo`}
      />

      <div className="mb-3 max-w-md">
        <AiImagesPanel />
      </div>

      {/* Filter and View Bar */}
      <ItemCatalogFilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onCreateNew={handleCreateNew}
        onExportCSV={handleExportCSV}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={totalCount}
      />

      {/* Main Content Area */}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-center text-sm text-red-300">
          Ocorreu um erro ao carregar o catálogo de artigos: {(error as any)?.message || 'Erro desconhecido'}
        </div>
      )}

      {viewMode === 'grid' ? (
        <ItemCatalogCardGrid
          items={items}
          totalCount={totalCount}
          page={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => handleFilterChange({ page: p })}
          onSelectItem={handleSelectItem}
          onEditItem={handleEditItem}
          onGiveItem={handleGiveItem}
          onArchiveItem={handleArchiveItem}
          isLoading={isLoading}
        />
      ) : (
        <ItemCatalogTableView
          items={items}
          totalCount={totalCount}
          page={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => handleFilterChange({ page: p })}
          onSelectItem={handleSelectItem}
          onEditItem={handleEditItem}
          onGiveItem={handleGiveItem}
          onArchiveItem={handleArchiveItem}
          isLoading={isLoading}
        />
      )}

      {/* Modal: Give Item to Hero */}
      <GiveItemSelectorModal
        item={itemToGive}
        open={giveModalOpen}
        onOpenChange={setGiveModalOpen}
      />

      {/* Sheet: Create / Edit with Live Player Preview */}
      <ItemFormSheet
        item={itemToEdit}
        open={formSheetOpen}
        onOpenChange={setFormSheetOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['item_catalog'] })}
        onArchived={() => queryClient.invalidateQueries({ queryKey: ['item_catalog'] })}
      />
    </div>
  );
});
