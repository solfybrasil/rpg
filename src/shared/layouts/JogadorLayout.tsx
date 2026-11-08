import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, m } from 'motion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useActiveBattleMap } from '../../features/battle-map/api/useBattle.ts';
import { useHero, useInventory } from '../hooks/baseHooks.ts';
import { useSessionStore } from '../stores/session.ts';
import { motionTokens, tabTransitionVariants } from '../styles/motion.ts';
import { Belt, type BeltItem } from '../ui/Belt';
import { BottomNav } from '../ui/BottomNav';
import { EpicMoment } from '../ui/EpicMoment';
import { type FloatingItem, FloatingNumberContainer } from '../ui/FloatingNumber';
import { Orb } from '../ui/Orb';
import { StatusBar } from '../ui/StatusBar';

export const JogadorLayout: React.FC = () => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;
  const heroId = useSessionStore((s) => s.heroId);
  const { hero } = useHero(heroId);
  const { data: inventory = [] } = useInventory(heroId);
  const { data: activeBattleMap } = useActiveBattleMap();

  const isBattleLive = activeBattleMap?.status === 'ao_vivo';
  const isMesaRoute = currentPath.includes('/jogador/mesa');

  // Estados de Realtime e Animações
  const [isDamaged, setIsDamaged] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [showVignette, setShowVignette] = useState(false);
  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
  const [epicMoment, setEpicMoment] = useState<'level_up' | null>(null);

  const prevHealthRef = useRef<number | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  const previousStatusRef = useRef<string | null | undefined>(undefined);

  // Reatividade em tempo real aos eventos do herói (SKILL.md Seção 9.5)
  useEffect(() => {
    if (!hero) return;

    const currentHealth = hero.health ?? 20;
    const currentLevel = hero.level ?? 1;

    // Detecta Dano ou Cura do Mestre
    if (prevHealthRef.current !== null && prevHealthRef.current !== currentHealth) {
      const diff = currentHealth - prevHealthRef.current;
      const id = Date.now().toString();

      if (diff < 0) {
        setIsDamaged(true);
        setShowVignette(true);
        setFloatingItems((prev) => [...prev, { id, value: Math.abs(diff), type: 'damage' }]);
        setTimeout(() => setIsDamaged(false), 400);
        setTimeout(() => setShowVignette(false), 320);
      } else if (diff > 0) {
        setIsHealing(true);
        setFloatingItems((prev) => [...prev, { id, value: diff, type: 'heal' }]);
        setTimeout(() => setIsHealing(false), 600);
      }
    }
    prevHealthRef.current = currentHealth;

    // Detecta Subida de Nível
    if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current) {
      setEpicMoment('level_up');
    }
    prevLevelRef.current = currentLevel;
  }, [hero]);

  // Abre sozinha quando a mesa liga (transição para 'ao_vivo')
  useEffect(() => {
    const prev = previousStatusRef.current;
    const current = activeBattleMap?.status;
    previousStatusRef.current = current;

    if (prev !== undefined) {
      if (prev !== 'ao_vivo' && current === 'ao_vivo') {
        navigate({ to: '/jogador/mesa' });
      }
    }
  }, [activeBattleMap?.status, navigate]);

  // Itens rápidos para o Cinto de Poções/Consumíveis
  const quickItems: BeltItem[] = useMemo(() => {
    return inventory.slice(0, 4).map((it) => ({
      id: it.id,
      name: it.item_name || 'Item do Cinto',
      quantity: it.quantity || 1,
      rarity: (it.rarity as BeltItem['rarity']) || 'comum',
    }));
  }, [inventory]);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[var(--abyss)] text-[var(--text)] overflow-hidden select-none font-sans">
      {/* Vinheta de Dano na Tela */}
      {showVignette && <div className="damage-vignette" />}

      {/* Momento Épico: Subida de Nível */}
      <EpicMoment
        type={epicMoment}
        level={hero?.level || 2}
        heroName={hero?.name || 'Jurado'}
        onClose={() => setEpicMoment(null)}
      />

      {/* Contêiner centralizado no PC (máx 480px), tela cheia no Celular */}
      <div className="w-full max-w-[480px] mx-auto flex-1 flex flex-col h-full relative overflow-hidden bg-[var(--stone)] border-x border-[var(--iron)]/40 shadow-2xl">
        {/* 1. StatusBar no topo (52px) */}
        <StatusBar
          heroName={hero?.name || 'Jurado de Aldrenor'}
          level={hero?.level || 1}
          coinsBronze={hero?.coins_bronze || 0}
        />

        {/* Banner de Batalha Ao Vivo */}
        {isBattleLive && !isMesaRoute && (
          <Link
            to="/jogador/mesa"
            className="h-10 bg-[var(--gold-lo)]/30 border-b border-[var(--gold-lo)] px-4 flex items-center justify-between text-xs font-serif text-[var(--gold-hi)] hover:brightness-125 transition-all shrink-0 z-20"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-ping" />
              <span className="font-['Cinzel',serif] font-bold">Mesa de Batalha Ao Vivo</span>
            </div>
            <span className="text-[10px] uppercase font-['Cinzel',serif] tracking-wider text-[var(--gold)] font-bold">
              Entrar →
            </span>
          </Link>
        )}

        {/* 2. Área Central com Rolagem e Transição de Tela Animada */}
        <main
          className={`flex-1 flex flex-col relative min-h-0 ${
            isMesaRoute
              ? 'overflow-hidden'
              : 'overflow-y-auto pb-[calc(68px+env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={currentPath}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={tabTransitionVariants}
              className="flex-1 flex flex-col w-full"
            >
              <Outlet />
            </m.div>
          </AnimatePresence>
        </main>

        {/* 3. Navegação Inferior Fixa (Apenas as 5 abas, sem orbes flutuantes cobrindo a tela e sem cinto) */}
        {!isMesaRoute && (
          <div className="z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
};
