import {
  ArrowRight,
  BookOpen,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  FlaskConical,
  GraduationCap,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import React from 'react';
import type { GridRecipeRecord } from '../../../entities/recipe';
import { Badge, type BadgeVariant, Button } from '../../../shared/ui/index.ts';

interface DMRecipeCardProps {
  recipe: GridRecipeRecord;
  onEdit: (recipe: GridRecipeRecord) => void;
  onTeach: (recipe: GridRecipeRecord) => void;
  onToggleActive: (recipe: GridRecipeRecord) => void;
  onDelete: (recipe: GridRecipeRecord) => void;
}

function getRarityBadgeVariant(rarity: string | null): BadgeVariant {
  switch ((rarity || '').toLowerCase()) {
    case 'comum':
      return 'comum';
    case 'incomum':
      return 'incomum';
    case 'raro':
      return 'raro';
    case 'épico':
    case 'epico':
    case 'lendário':
    case 'lendario':
      return 'lendario';
    case 'artefato':
      return 'artefato';
    case 'maldito':
      return 'danger';
    default:
      return 'default';
  }
}

export const DMRecipeCard: React.FC<DMRecipeCardProps> = ({
  recipe,
  onEdit,
  onTeach,
  onToggleActive,
  onDelete,
}) => {
  const stationIcon =
    recipe.station === 'alquimia' ? (
      <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
    ) : recipe.station === 'cozinha' ? (
      <Utensils className="h-3.5 w-3.5 text-amber-400" />
    ) : (
      <Flame className="h-3.5 w-3.5 text-red-400" />
    );

  const rarityVariant = getRarityBadgeVariant(recipe.rarity);
  const grid = Array.isArray(recipe.grid) ? recipe.grid : Array(9).fill(null);
  const gridNames = Array.isArray(recipe.grid_names) ? recipe.grid_names : Array(9).fill(null);

  return (
    <div
      data-testid={`recipe-card-${recipe.id}`}
      className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
        recipe.active
          ? 'border-white/10 bg-[#141418] hover:border-white/20'
          : 'border-white/5 bg-[#0f0f12]/60 opacity-60'
      }`}
    >
      <div>
        {/* Header: Station + Name + Rarity */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-white/50">
                {stationIcon}
                <span>{recipe.station}</span>
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[11px] font-mono font-semibold text-[#f5b65b]">
                Peso {recipe.peso}
              </span>
            </div>
            <h4 className="font-serif font-bold text-sm text-[#ebe6d6] truncate" title={recipe.result_name}>
              {recipe.result_name}
            </h4>
          </div>

          <Badge variant={rarityVariant} size="sm">
            {recipe.rarity || 'Comum'}
          </Badge>
        </div>

        {/* 3x3 Visual Grid + Product Arrow Flow */}
        <div className="flex items-center justify-between gap-3 my-3 p-2.5 rounded-xl border border-white/5 bg-black/40">
          {/* Mini 3x3 Grid */}
          <div className="grid grid-cols-3 gap-1 w-24 h-24 shrink-0 p-1 rounded-lg border border-white/10 bg-[#0e0e11]">
            {grid.map((itemId, idx) => {
              const name = gridNames[idx];
              const isFilled = Boolean(itemId);
              return (
                <div
                  key={idx}
                  title={name ? `${name} (Slot #${idx + 1})` : `Slot #${idx + 1} Vazio`}
                  className={`flex items-center justify-center rounded border text-[9px] transition-all select-none ${
                    isFilled
                      ? 'border-[#f5b65b]/50 bg-[#f5b65b]/10 text-white font-mono'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  {isFilled ? '✦' : ''}
                </div>
              );
            })}
          </div>

          <ArrowRight className="h-4 w-4 text-white/30 shrink-0" />

          {/* Result Item Box */}
          <div className="flex-1 flex flex-col items-center justify-center text-center p-2 rounded-lg border border-[#f5b65b]/30 bg-[#f5b65b]/5 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#f5b65b]/40 bg-[#16161b] text-xl shadow-md">
              {recipe.station === 'alquimia' ? '🧪' : recipe.station === 'cozinha' ? '🍲' : '🗡️'}
            </div>
            <p className="mt-1 font-serif text-xs font-bold text-[#ebe6d6] truncate w-full">
              {recipe.result_qty > 1 ? `${recipe.result_qty}x ` : ''}
              {recipe.result_name}
            </p>
            <span className="text-[10px] text-white/40 truncate">
              {recipe.skill || 'Manufatura'}
            </span>
          </div>
        </div>

        {/* Ingredients Summary */}
        <div className="text-[11px] text-white/50 line-clamp-1 italic font-serif">
          Ingredientes:{' '}
          {recipe.ingredients && recipe.ingredients.length > 0
            ? recipe.ingredients.map((ing) => `${ing.qty || 1}x ${ing.name || ing.id}`).join(', ')
            : 'Fórmula direta'}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-1">
        <Button
          variant="ghost"
          size="sm"
          data-testid={`teach-recipe-btn-${recipe.id}`}
          onClick={() => onTeach(recipe)}
          className="flex items-center gap-1 text-xs text-[#f5b65b] hover:bg-[#f5b65b]/10 px-2 py-1"
          title="Ensinar receita a um herói"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ensinar</span>
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            data-testid={`edit-recipe-btn-${recipe.id}`}
            onClick={() => onEdit(recipe)}
            className="text-xs px-2 py-1 text-white/70 hover:text-white"
            title="Editar fórmula e grade 3x3"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(recipe)}
            className={`text-xs px-2 py-1 ${
              recipe.active ? 'text-white/40 hover:text-white' : 'text-emerald-400'
            }`}
            title={recipe.active ? 'Desativar receita' : 'Ativar receita'}
          >
            {recipe.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(recipe)}
            className="text-xs px-2 py-1 text-white/40 hover:text-red-400"
            title="Excluir receita definitivamente"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
