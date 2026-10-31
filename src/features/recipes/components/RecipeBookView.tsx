import { useNavigate } from '@tanstack/react-router';
import {
  Anvil,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  FlaskConical,
  Search,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import {
  type EnrichedRecipeResult,
  enrichRecipeWithInventory,
  filterRecipeList,
  type GridRecipeRecord,
  type WorkshopStation,
} from '../../../entities/recipe';
import { useHero, useInventory } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { useKnownRecipes, useWorkshopRecipes } from '../../workshop/api/useWorkshop';
import { playPageFlipSound } from '../utils/bookAudio';
import { RecipeCard } from './RecipeCard';

interface RecipeBookViewProps {
  onAssembleRecipe?: (recipe: GridRecipeRecord) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const RecipeBookView: React.FC<RecipeBookViewProps> = ({
  onAssembleRecipe,
  isModal = false,
  onCloseModal,
}) => {
  const navigate = useNavigate();
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  const { items: inventoryItems = [] } = useInventory(heroId);
  const { knownRecipeIds } = useKnownRecipes(heroId);

  // Busca receitas das 3 estações
  const { data: forgeRecipes = [] } = useWorkshopRecipes('forja');
  const { data: alchemyRecipes = [] } = useWorkshopRecipes('alquimia');
  const { data: cookingRecipes = [] } = useWorkshopRecipes('cozinha');

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<'todas' | WorkshopStation>('todas');
  const [onlyCraftable, setOnlyCraftable] = useState(false);

  // Paginação
  const [pageIndex, setPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // Unifica todas as receitas
  const allRawRecipes = useMemo(() => {
    return [...forgeRecipes, ...alchemyRecipes, ...cookingRecipes];
  }, [forgeRecipes, alchemyRecipes, cookingRecipes]);

  // Itens não equipados na mochila
  const backpackItems = useMemo(() => {
    return inventoryItems.filter((it) => !it.equip_slot);
  }, [inventoryItems]);

  // Enriquece receitas conhecidas com o inventário
  const enrichedList = useMemo(() => {
    return allRawRecipes
      .filter((r) => r.starter || knownRecipeIds.has(r.id))
      .map((r) => enrichRecipeWithInventory(r, backpackItems, true));
  }, [allRawRecipes, knownRecipeIds, backpackItems]);

  // Filtra de acordo com a barra de busca e chips
  const filteredList = useMemo(() => {
    return filterRecipeList(enrichedList, {
      search,
      station: selectedStation,
      onlyCraftable,
    });
  }, [enrichedList, search, selectedStation, onlyCraftable]);

  // No desktop são 2 páginas lado a lado (2 receitas por spread); no mobile 1 receita por página
  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));

  // Ajusta índice se o total diminuir
  useEffect(() => {
    if (pageIndex >= totalPages) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [totalPages, pageIndex]);

  const handlePrevPage = () => {
    if (pageIndex > 0) {
      playPageFlipSound();
      setIsFlipping(true);
      setPageIndex((p) => p - 1);
      setTimeout(() => setIsFlipping(false), 220);
    }
  };

  const handleNextPage = () => {
    if (pageIndex < totalPages - 1) {
      playPageFlipSound();
      setIsFlipping(true);
      setPageIndex((p) => p + 1);
      setTimeout(() => setIsFlipping(false), 220);
    }
  };

  // Suporte a teclado (setas esquerda e direita)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleAssemble = (recipe: EnrichedRecipeResult) => {
    if (onAssembleRecipe) {
      onAssembleRecipe(recipe);
      if (onCloseModal) onCloseModal();
    } else {
      // Navega para a bancada da oficina
      navigate({ to: '/jogador/oficina' });
    }
  };

  // Receitas da página atual
  const currentSpread = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, pageIndex, pageSize]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 pb-20 max-w-5xl mx-auto space-y-5">
      {/* Cabeçalho do Livro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold tracking-wide text-white flex items-center gap-2">
            <BookOpen size={22} className="text-amber-500" />
            <span>Livro de Receitas</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-600/40 text-amber-300 font-mono font-normal">
              {filteredList.length} receitas
            </span>
          </h1>
          <p className="text-xs text-neutral-400 font-serif italic mt-0.5">
            Compêndio de manufatura tradicional de Aldrenor para Forja, Alquimia e Cozinha.
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca Intuitiva */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shadow-inner">
        {/* Chips de Bancada */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'todas' as const, label: 'Todas' },
            { id: 'forja' as const, label: 'Forja', icon: Anvil, color: 'text-amber-500' },
            { id: 'alquimia' as const, label: 'Alquimia', icon: FlaskConical, color: 'text-purple-400' },
            { id: 'cozinha' as const, label: 'Cozinha', icon: UtensilsCrossed, color: 'text-emerald-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedStation === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStation(tab.id);
                  setPageIndex(0);
                  playPageFlipSound();
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-950 border border-amber-600/70 text-amber-200 shadow-sm'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {Icon && <Icon size={13} className={tab.color} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Campo de Busca e Toggle Posso Fazer Agora */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Toggle "Posso Fazer Agora" */}
          <button
            type="button"
            onClick={() => {
              setOnlyCraftable(!onlyCraftable);
              setPageIndex(0);
              playPageFlipSound();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              onlyCraftable
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(74,124,89,0.3)]'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                onlyCraftable ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-neutral-600'
              }`}
            >
              {onlyCraftable && <Check size={10} />}
            </div>
            <span>Posso fazer agora</span>
          </button>

          {/* Input de Busca */}
          <div className="relative w-44">
            <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
              placeholder="Buscar receita..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>
      </div>

      {/* Livro Minimalista: Folhas e Margem Fina Dourada */}
      <div className="relative rounded-2xl bg-neutral-900/40 border border-amber-900/30 ring-1 ring-amber-600/20 p-4 md:p-6 shadow-2xl backdrop-blur-sm min-h-[440px] flex flex-col justify-between">
        {/* Conteúdo das Páginas com Transição de 220ms */}
        <div
          className={`transition-all duration-200 ${
            isFlipping ? 'opacity-30 -translate-x-2' : 'opacity-100 translate-x-0'
          }`}
        >
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center font-mono text-neutral-500 space-y-2">
              <span className="text-3xl">📖</span>
              <span className="text-sm">Nenhuma receita encontrada para os filtros atuais.</span>
              <span className="text-xs text-neutral-600">
                Tente desmarcar "Posso fazer agora" ou limpar a busca.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {currentSpread.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onAssemble={handleAssemble} />
              ))}
              {/* Espaço reservado se houver número ímpar na última página no desktop */}
              {currentSpread.length === 1 && (
                <div className="hidden md:flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-neutral-800/60 bg-neutral-950/20 text-neutral-600 font-mono text-xs text-center">
                  <span>Página em branco</span>
                  <span className="text-[10px] text-neutral-700 mt-1">
                    Novas fórmulas serão inscritas aqui quando descobertas
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Livro: Controles de Virar Página */}
        <div className="flex items-center justify-between pt-6 mt-4 border-t border-neutral-800/80">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={pageIndex === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              pageIndex === 0
                ? 'opacity-30 cursor-not-allowed text-neutral-600'
                : 'bg-neutral-900 hover:bg-neutral-800 text-amber-200 border border-neutral-700 cursor-pointer active:scale-95'
            }`}
          >
            <ChevronLeft size={16} />
            <span>Página Anterior</span>
          </button>

          <span className="text-xs font-mono text-neutral-400">
            Página <strong className="text-white">{pageIndex + 1}</strong> de {totalPages}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={pageIndex >= totalPages - 1}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              pageIndex >= totalPages - 1
                ? 'opacity-30 cursor-not-allowed text-neutral-600'
                : 'bg-neutral-900 hover:bg-neutral-800 text-amber-200 border border-neutral-700 cursor-pointer active:scale-95'
            }`}
          >
            <span>Próxima Página</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
