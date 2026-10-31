import { Check, GraduationCap, Sparkles, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import type { GridRecipeRecord } from '../../../entities/recipe';
import { Button, Modal } from '../../../shared/ui/index.ts';
import { useTeachRecipeMutation } from '../api/useDMWorkshop.ts';

const DEFAULT_HEROES = [
  { id: 'kaelis_moonfire', name: 'Kaelis Moonfire', title: 'O Conjurador Arcano', icon: '🧙‍♂️' },
  { id: 'malenia', name: 'Malenia', title: 'A Lâmina Carmesim', icon: '⚔️' },
  { id: 'tor_bjorn', name: 'Tor-Bjorn', title: 'O Bárbaro do Norte', icon: '🛡️' },
];

interface TeachRecipeModalProps {
  recipe: GridRecipeRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TeachRecipeModal: React.FC<TeachRecipeModalProps> = ({
  recipe,
  open,
  onOpenChange,
}) => {
  const [selectedHeroId, setSelectedHeroId] = useState<string>('kaelis_moonfire');
  const teachMutation = useTeachRecipeMutation();

  if (!recipe) return null;

  const handleTeach = async () => {
    if (!selectedHeroId) return;

    const hero = DEFAULT_HEROES.find((h) => h.id === selectedHeroId);
    try {
      await teachMutation.mutateAsync({
        characterId: selectedHeroId,
        recipeId: recipe.id,
      });

      toast.success(
        `Fórmula de "${recipe.result_name}" ensinada a ${hero?.name || selectedHeroId}!`,
        {
          description: 'A receita agora consta como aprendida no livro do herói.',
        },
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Falha ao ensinar receita: ${err.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Ensinar "${recipe.result_name}"`}
      description="Transmita os conhecimentos arcanos desta fórmula diretamente à mente de um aventureiro."
      className="max-w-md bg-[#121215] border border-white/10"
    >
      <div className="space-y-4 pt-2">
        {/* Recipe banner */}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#f5b65b]/40 bg-[#1c1c22] text-2xl">
            {recipe.station === 'alquimia' ? '🧪' : recipe.station === 'cozinha' ? '🍲' : '🗡️'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-serif text-sm font-bold text-[#ebe6d6] truncate">
              {recipe.result_name}
            </h4>
            <p className="text-xs text-white/50 truncate">
              Bancada: {recipe.station} · Peso {recipe.peso} · {recipe.rarity}
            </p>
          </div>
        </div>

        {/* Hero selection list */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Aventureiro Aprendiz
          </label>
          <div className="grid grid-cols-1 gap-2">
            {DEFAULT_HEROES.map((hero) => {
              const isSelected = selectedHeroId === hero.id;
              return (
                <button
                  key={hero.id}
                  type="button"
                  data-testid={`teach-hero-${hero.id}`}
                  onClick={() => setSelectedHeroId(hero.id)}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-[#f5b65b] bg-[#f5b65b]/10 shadow-[0_0_12px_rgba(245,182,91,0.2)]'
                      : 'border-white/10 bg-[#18181d] hover:border-white/20 hover:bg-[#202026]'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg ${
                      isSelected
                        ? 'border-[#f5b65b] bg-[#f5b65b]/20 text-[#f5b65b]'
                        : 'border-white/10 bg-black/40 text-white/60'
                    }`}
                  >
                    {hero.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-[#f5b65b]' : 'text-[#ebe6d6]'
                      }`}
                    >
                      {hero.name}
                    </p>
                    <p className="text-xs text-white/40 truncate">{hero.title}</p>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5b65b] text-black">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={teachMutation.isPending}
            className="text-white/60 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            data-testid="confirm-teach-recipe-btn"
            variant="gold"
            onClick={handleTeach}
            disabled={teachMutation.isPending || !selectedHeroId}
            className="flex items-center gap-1.5"
          >
            <GraduationCap className="h-4 w-4" />
            <span>{teachMutation.isPending ? 'Ensinando...' : 'Ensinar Fórmula'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
