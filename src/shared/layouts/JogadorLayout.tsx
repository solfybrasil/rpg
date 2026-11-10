import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { m } from 'motion/react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useActiveBattleMap } from '../../features/battle-map/api/useBattle.ts';
import { PlayerChestNotifier } from '../../features/treasure/components/ChestNotifier';
import { PlayerClockStrip } from '../../features/world-clock/components/PlayerClockStrip';
import { useHero } from '../hooks/baseHooks.ts';
import { useSessionStore } from '../stores/session.ts';
import { tabTransitionVariants } from '../styles/motion.ts';
import { BottomNav } from '../ui/BottomNav';
import { EpicMoment } from '../ui/EpicMoment';
import { StatusBar } from '../ui/StatusBar';

export const JogadorLayout: React.FC = () => {
  // Só o caminho: o layout não re-renderiza a cada evento do roteador.
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const heroId = useSessionStore((s) => s.heroId);
  const { hero } = useHero(heroId);
  // Aqui só importa saber se a mesa ligou (o tempo real avisa na hora).
  const { data: activeBattleMap } = useActiveBattleMap({ pollMs: 15_000 });

  const isBattleLive = activeBattleMap?.status === 'ao_vivo';
  const isMesaRoute = currentPath.includes('/jogador/mesa');

  // Estados de Realtime e Animações
  const [showVignette, setShowVignette] = useState(false);
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
    if (prevHealthRef.current !== null && currentHealth < prevHealthRef.current) {
      setShowVignette(true);
      setTimeout(() => setShowVignette(false), 320);
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
      <div
        className={`w-full ${isMesaRoute ? '' : 'max-w-[480px]'} mx-auto flex-1 flex flex-col h-full relative overflow-hidden bg-[var(--stone)] border-x border-[var(--iron)]/40 shadow-2xl`}
      >
        {/* 1. StatusBar no topo (52px) */}
        <StatusBar
          heroName={hero?.name || 'Jurado de Aldrenor'}
          level={hero?.level || 1}
          coinsBronze={hero?.coins_bronze || 0}
        />

        {/* Relógio do mundo (toque para ver clima, fome e cansaço) */}
        {!isMesaRoute && <PlayerClockStrip hero={hero ?? null} />}

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
          {/* Só a entrada é animada: com "esperar a saída", a tela nova ficava
              presa atrás da antiga (e o <Outlet/> já mostrava a nova saindo). */}
          <m.div
            key={currentPath}
            initial="initial"
            animate="animate"
            variants={tabTransitionVariants}
            className="flex-1 flex flex-col w-full"
          >
            <Outlet />
          </m.div>
        </main>

        {/* 3. Navegação Inferior Fixa (Apenas as 5 abas, sem orbes flutuantes cobrindo a tela e sem cinto) */}
        {!isMesaRoute && (
          <div className="z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <BottomNav />
          </div>
        )}

        {/* Baú liberado pelo Mestre (fora da mesa de batalha) */}
        {!isMesaRoute && <PlayerChestNotifier heroId={heroId ?? null} heroName={hero?.name || 'Jurado'} />}
      </div>
    </div>
  );
};
