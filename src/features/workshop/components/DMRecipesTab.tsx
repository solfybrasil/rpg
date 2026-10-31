import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  BookOpen,
  Filter,
  Flame,
  FlaskConical,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  Utensils,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { GridRecipeRecord, WorkshopStation } from '../../../entities/recipe';
import { Badge, Button } from '../../../shared/ui/index.ts';
import {
  type GridRecipeFilter,
  useAllGridRecipes,
  useDeleteGridRecipeMutation,
  useSaveGridRecipeMutation,
} from '../api/useDMWorkshop.ts';
import { DMRecipeCard } from './DMRecipeCard.tsx';
import { RecipeEditorSheet } from './RecipeEditorSheet.tsx';
import { TeachRecipeModal } from './TeachRecipeModal.tsx';

export const DMRecipesTab: React.FC = () => {
  const [filter, setFilter] = useState<GridRecipeFilter>({
    station: 'todos',
    rarity: 'Todas',
    search: '',
  });

  const { data: recipes = [], isLoading, isError } = useAllGridRecipes(filter);
  const deleteMutation = useDeleteGridRecipeMutation();
  const saveMutation = useSaveGridRecipeMutation();

  // Modal / Sheet States
  const [editorOpen, setEditorOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<GridRecipeRecord | null>(null);
  const [teachModalOpen, setTeachModalOpen] = useState(false);
  const [recipeToTeach, setRecipeToTeach] = useState<GridRecipeRecord | null>(null);

  // Responsive virtualization columns calculation
  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setColumns(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const recipeRows = useMemo(() => {
    const rows: GridRecipeRecord[][] = [];
    for (let i = 0; i < recipes.length; i += columns) {
      rows.push(recipes.slice(i, i + columns));
    }
    return rows;
  }, [recipes, columns]);

  const virtualizer = useWindowVirtualizer({
    count: recipeRows.length,
    estimateSize: () => 240,
    overscan: 4,
  });

  const handleCreateNew = () => {
    setRecipeToEdit(null);
    setEditorOpen(true);
  };

  const handleEdit = (rec: GridRecipeRecord) => {
    setRecipeToEdit(rec);
    setEditorOpen(true);
  };

  const handleTeach = (rec: GridRecipeRecord) => {
    setRecipeToTeach(rec);
    setTeachModalOpen(true);
  };

  const handleToggleActive = async (rec: GridRecipeRecord) => {
    try {
      await saveMutation.mutateAsync({
        ...rec,
        active: !rec.active,
      });
      toast.success(
        rec.active
          ? `Receita "${rec.result_name}" desativada.`
          : `Receita "${rec.result_name}" ativada na mesa.`,
      );
    } catch (err: any) {
      toast.error(`Falha ao alterar estado da receita: ${err.message}`);
    }
  };

  const handleDelete = async (rec: GridRecipeRecord) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir DEFINITIVAMENTE a receita de "${rec.result_name}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(rec.id);
      toast.success(`Receita "${rec.result_name}" excluída.`);
    } catch (err: any) {
      toast.error(`Falha ao excluir receita: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-[#121215]/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              data-testid="recipe-search-input"
              placeholder="Buscar receita ou produto..."
              value={filter.search || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none font-serif"
            />
          </div>

          {/* Station Selector */}
          <select
            data-testid="recipe-station-select"
            value={filter.station || 'todos'}
            onChange={(e) => setFilter((prev) => ({ ...prev, station: e.target.value }))}
            className="h-9 rounded-xl border border-white/10 bg-[#18181d] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
          >
            <option value="todos">Todas as Bancadas</option>
            <option value="forja">Forja</option>
            <option value="alquimia">Alquimia</option>
            <option value="cozinha">Cozinha</option>
          </select>

          {/* Rarity Selector */}
          <select
            value={filter.rarity || 'Todas'}
            onChange={(e) => setFilter((prev) => ({ ...prev, rarity: e.target.value }))}
            className="h-9 rounded-xl border border-white/10 bg-[#18181d] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
          >
            <option value="Todas">Todas as Raridades</option>
            <option value="Comum">Comum</option>
            <option value="Incomum">Incomum</option>
            <option value="Raro">Raro</option>
            <option value="Épico">Épico</option>
            <option value="Lendário">Lendário</option>
            <option value="Artefato">Artefato</option>
          </select>
        </div>

        <Button
          variant="gold"
          data-testid="create-recipe-btn"
          onClick={handleCreateNew}
          className="flex items-center gap-1.5 shadow-md shadow-[#f5b65b]/10 text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Receita 3x3</span>
        </Button>
      </div>

      {/* Stats counter strip */}
      <div className="flex items-center justify-between text-xs text-white/50 px-1 font-serif">
        <span>
          Exibindo <b className="font-mono text-[#f5b65b]">{recipes.length}</b> fórmula(s) na grade
        </span>
      </div>

      {/* Virtualized Recipe List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[#a8947c] space-y-3">
          <Sparkles className="h-8 w-8 animate-pulse text-[#f5b65b]" />
          <p className="font-serif italic text-sm">Consultando fórmulas 3x3 da bancada...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-white/5 rounded-2xl bg-[#121215]/60">
          <BookOpen className="h-10 w-10 text-white/20 mb-3" />
          <h3 className="font-serif text-base text-[#ebe6d6]">Nenhuma Receita Encontrada</h3>
          <p className="font-serif text-xs text-white/50 max-w-sm mt-1">
            Nenhuma fórmula corresponde aos filtros selecionados. Tente ajustar a busca ou crie uma nova.
          </p>
        </div>
      ) : (
        <div
          data-testid="virtual-recipe-list"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowRecipes = recipeRows[virtualRow.index] || [];
            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4`}
              >
                {rowRecipes.map((rec) => (
                  <DMRecipeCard
                    key={rec.id}
                    recipe={rec}
                    onEdit={handleEdit}
                    onTeach={handleTeach}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Sheet */}
      <RecipeEditorSheet
        recipe={recipeToEdit}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      {/* Teach Modal */}
      <TeachRecipeModal
        recipe={recipeToTeach}
        open={teachModalOpen}
        onOpenChange={setTeachModalOpen}
      />
    </div>
  );
};
