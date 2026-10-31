import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import React, { useEffect, useRef, useMemo } from 'react';
import { useActiveBattleMap } from '../../features/battle-map/api/useBattle.ts';
import { useHero, useInventory } from '../hooks/baseHooks.ts';
import { useSessionStore } from '../stores/session.ts';
import { Belt, type BeltItem } from '../ui/Belt';
import { BottomNav } from '../ui/BottomNav';
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

  const previousStatusRef = useRef<string | null | undefined>(undefined);

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
    <div className="flex-1 flex flex-col h-full w-full bg-[var(--abyss)] text-[var(--text)] overflow-hidden select-none">
      {/* Contêiner centralizado no PC (máx 480px), tela cheia no Celular */}
      <div className="w-full max-w-[480px] mx-auto flex-1 flex flex-col h-full relative overflow-hidden bg-[var(--stone)] border-x border-[var(--iron)]/40 shadow-2xl">
        {/* 1. StatusBar no topo (52px) */}
        <StatusBar
          heroName={hero?.name || 'Jurado de Aldrenor'}
          level={hero?.level || 1}
          coinsBronze={hero?.coins_bronze || 0}
        />

        {/* Banner de Batalha Ao Vivo (se houver combate aberto e o jogador estiver em outra aba) */}
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

        {/* 2. Área Central com Rolagem */}
        <main
          className={`flex-1 flex flex-col relative min-h-0 ${
            isMesaRoute ? 'overflow-hidden' : 'overflow-y-auto pb-[155px]'
          }`}
        >
          <Outlet />
        </main>

        {/* 3. HUD Fixo na Base (150px): Orbe Vida (esquerda), Orbe Foco (direita), Cinto (centro) e BottomNav (base) */}
        {!isMesaRoute && (
          <div className="hud">
            {/* Cinto de poções */}
            <Belt items={quickItems} />

            {/* Orbe de Vida (Carmim) */}
            <Orb
              variant="hp"
              current={hero?.health ?? 20}
              max={hero?.max_health ?? 20}
              label="VIDA"
            />

            {/* Orbe de Foco (Azul Mana) */}
            <Orb
              variant="focus"
              current={hero?.focus ?? 5}
              max={hero?.max_focus ?? 5}
              label="FOCO"
            />

            {/* 5 Abas: Ficha, Mochila, Grimório, Diário, Mais */}
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
};
