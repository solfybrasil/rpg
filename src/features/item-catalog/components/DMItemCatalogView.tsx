import { useQueryClient } from '@tanstack/react-query';
import { Download, Package, Plus, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../shared/ui/index.ts';
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

export const DMItemCatalogView: React.FC = () => {
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

  const handleFilterChange = (updates: Partial<ItemCatalogFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilter({
      page: 1,
      pageSize: 40,
      search: '',
      category: undefined,
      rarity: undefined,
      sortBy: 'name',
    });
  };

  const handleCreateNew = () => {
    setItemToEdit(null);
    setFormSheetOpen(true);
  };

  const handleEditItem = (item: ItemCatalog) => {
    setItemToEdit(item);
    setFormSheetOpen(true);
  };

  const handleSelectItem = (item: ItemCatalog) => {
    // Abre a visualização em sheet com prévia e detalhes
    setItemToEdit(item);
    setFormSheetOpen(true);
  };

  const handleGiveItem = (item: ItemCatalog) => {
    setItemToGive(item);
    setGiveModalOpen(true);
  };

  const handleArchiveItem = async (item: ItemCatalog) => {
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
  };

  const handleExportCSV = () => {
    exportItemsToCSV(items);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5b65b]/40 bg-[#f5b65b]/10 text-[#f5b65b] shadow-[0_0_15px_rgba(245,182,91,0.2)]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#ebe6d6]">
                Catálogo de Artigos & Tesouros
              </h1>
              <p className="font-serif text-xs text-white/50">
                Mais de 3.000 itens lendários, armas, armaduras, consumíveis e relíquias de Aldrenor.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="gold"
            data-testid="create-item-btn"
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 shadow-lg shadow-[#f5b65b]/10"
          >
            <Plus className="h-4 w-4" />
            <span>Forjar Novo Artigo</span>
          </Button>
        </div>
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
};
