import React, { useState } from 'react';
import { toast } from 'sonner';
import { calcDefesa, calcFocoMax, calcVidaMax } from '../../../entities/hero';
import { useHero, useHeroes } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { AttributesGrid } from './AttributesGrid';
import { BiographyCard, type BioData } from './BiographyCard';
import { EffectDetailModal } from './EffectDetailModal';
import { HeroHeader } from './HeroHeader';
import { LevelUpModal } from './LevelUpModal';
import { OathGiftCard } from './OathGiftCard';
import { PlagueTracker } from './PlagueTracker';
import { SkillsList } from './SkillsList';
import { VitalsGrid } from './VitalsGrid';

export const PlayerSheetView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const selectHero = useSessionStore((s) => s.selectHero);

  const heroId = sessionHeroId || 'teste_1';

  const { hero: directHero, updateHeroAsync, isLoading } = useHero(heroId);
  const { heroes, isLoading: isLoadingHeroes } = useHeroes();

  // Se o herói solicitado não existir (ex: teste deletado), usa o primeiro herói disponível (ex: tor_bjorn)
  const hero = directHero || heroes[0] || null;

  // Modais
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<any>(null);
  const [isSavingBio, setIsSavingBio] = useState(false);

  if ((isLoading && !hero) || (isLoadingHeroes && !hero)) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span className="text-xs uppercase font-cinzel text-[var(--gold-dim)] tracking-widest">
            Invocando Ficha do Jurado...
          </span>
        </div>
      </main>
    );
  }

  if (!hero) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-xs text-[var(--text-3)] font-cinzel">
          Nenhum herói encontrado na mesa.
        </div>
      </main>
    );
  }

  // Atributos
  const attrs = (hero.attributes || {
    corpo: 0,
    vontade: 0,
    astucia: 0,
    presenca: 0,
  }) as Record<string, number>;

  // Defesa Canônica
  const defense = hero.defense ?? calcDefesa(0, 0);

  // Bio fields (with fallback to oath essence and irony)
  const treeObj = (hero.oath_tree && typeof hero.oath_tree === 'object' ? hero.oath_tree : {}) as Record<string, any>;
  const bioMeta = treeObj.bio || {};
  const ideal = bioMeta.ideal || hero.oath_power || 'Fidelidade absoluta ao juramento solene.';
  const defeito = bioMeta.defeito || 'A carne apodrece se a promessa for quebrada.';

  // Alternar Inspiração
  const handleToggleInspiration = async () => {
    const cur = hero.inspiration ?? 0;
    const next = cur >= 2 ? 0 : cur + 1;
    try {
      await updateHeroAsync({ inspiration: next });
      toast.success(next > cur ? 'Inspiração concedida!' : 'Inspiração utilizada.');
    } catch {
      toast.error('Erro ao atualizar inspiração');
    }
  };

  // Salvar Biografia
  const handleSaveBio = async (data: BioData) => {
    setIsSavingBio(true);
    try {
      const updatedTree = {
        ...treeObj,
        bio: {
          ideal: data.ideal,
          defeito: data.defeito,
        },
      };

      await updateHeroAsync({
        backstory: data.backstory,
        connection: data.connection,
        oath_tree: updatedTree,
      });
      toast.success('Biografia atualizada com sucesso!');
    } catch (err) {
      toast.error('Falha ao salvar biografia.');
    } finally {
      setIsSavingBio(false);
    }
  };

  // Subir de Nível
  const handleConfirmLevelUp = async (choices: {
    boostAttr?: string;
    specSkill?: string;
    newSkill?: string;
  }) => {
    const curLevel = hero.level ?? 1;
    const nextLevel = curLevel + 1;
    const newMaxHp = (hero.max_health ?? 10) + 4;
    const newHp = Math.min(newMaxHp, (hero.health ?? 10) + 4);

    const patch: any = {
      level: nextLevel,
      max_health: newMaxHp,
      health: newHp,
    };

    // Aumento de atributo (4, 8, 10)
    if (choices.boostAttr) {
      const nextAttrs = { ...attrs };
      nextAttrs[choices.boostAttr] = (nextAttrs[choices.boostAttr] || 0) + 1;
      patch.attributes = nextAttrs;

      // Recalcula foco se vontade aumentou
      if (choices.boostAttr === 'vontade') {
        const newMaxFoco = calcFocoMax(3, nextAttrs.vontade, nextLevel);
        patch.max_focus = newMaxFoco;
        patch.focus = newMaxFoco;
      }
    }

    // Especialização de perícia (nível 5)
    if (choices.specSkill && Array.isArray(hero.skills)) {
      patch.skills = hero.skills.map((s: any) => {
        const sName = typeof s === 'string' ? s : s.name;
        if (sName === choices.specSkill) {
          return { name: sName, bonus: 2, nivel: 3 };
        }
        return s;
      });
    }

    // Nova perícia (nível 7)
    if (choices.newSkill && Array.isArray(hero.skills)) {
      patch.skills = [...hero.skills, { name: choices.newSkill, bonus: 1, nivel: 1 }];
    }

    try {
      await updateHeroAsync(patch);
      toast.success(`Consagração concluída! Nível ${nextLevel} atingido.`);
    } catch {
      toast.error('Erro ao consagrar subida de nível.');
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full pb-16 px-3 sm:px-4">
      {/* 1. Header do Herói (Avatar, Nome, Nível, XP) */}
      <HeroHeader
        hero={hero}
        heroes={heroes}
        selectedHeroId={heroId}
        onSelectHero={selectHero}
        onOpenLevelUp={() => setIsLevelUpOpen(true)}
        onToggleInspiration={handleToggleInspiration}
      />

      {/* 2. Atributos em 4 blocos grandes (Cinzel 32, label Inter) */}
      <AttributesGrid attributes={hero.attributes} />

      {/* 3. Vitais: Vida, Foco, Defesa, Saciedade */}
      <VitalsGrid
        hero={hero}
        defense={defense}
        onOpenEffectModal={(eff) => setSelectedEffect(eff)}
      />

      {/* 4. Peste do Juramento (4 faixas e marcador) */}
      <PlagueTracker plague={hero.plague ?? 0} />

      {/* 5. Juramento & Dom do Voto (4 estágios) */}
      <OathGiftCard
        oath={hero.oath}
        oathType={hero.oath_type}
        oathPower={hero.oath_power}
        oathItem={hero.oath_item}
        gift={hero.gift}
        level={hero.level}
      />

      {/* 6. Perícias com nível em pontos (●●○) e bônus tabular-nums */}
      <SkillsList skills={hero.skills} />

      {/* 7. Biografia (Antecedente, Vínculo, Ideal, Defeito) */}
      <BiographyCard
        backstory={hero.backstory}
        connection={hero.connection}
        ideal={ideal}
        defeito={defeito}
        onSave={handleSaveBio}
        isSaving={isSavingBio}
      />

      {/* Modais */}
      <LevelUpModal
        hero={hero}
        isOpen={isLevelUpOpen}
        onClose={() => setIsLevelUpOpen(false)}
        onConfirm={handleConfirmLevelUp}
      />

      <EffectDetailModal
        effect={selectedEffect}
        onClose={() => setSelectedEffect(null)}
      />
    </div>
  );
};
