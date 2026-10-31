import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Backpack,
  BookOpen,
  Compass,
  Dices,
  FileText,
  GitFork,
  Hammer,
  Mail,
  MapPin,
  MoreHorizontal,
  ShoppingBag,
  Swords,
  User,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useActiveBattleMap } from '../../features/battle-map/api/useBattle.ts';
import { useHero } from '../hooks/baseHooks.ts';
import { useSessionStore } from '../stores/session.ts';
import { Bar } from '../ui/Card.tsx';

export const JogadorLayout: React.FC = () => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;
  const heroId = useSessionStore((s) => s.heroId);
  const { hero } = useHero(heroId);
  const { data: activeBattleMap } = useActiveBattleMap();
  const [moreOpen, setMoreOpen] = useState(false);

  const isBattleLive = activeBattleMap?.status === 'ao_vivo';

  const previousStatusRef = useRef<string | null | undefined>(undefined);

  // Abre sozinha quando a mesa liga (transição para 'ao_vivo')
  useEffect(() => {
    const prev = previousStatusRef.current;
    const current = activeBattleMap?.status;
    previousStatusRef.current = current;

    if (prev !== undefined) {
      if (prev !== 'ao_vivo' && current === 'ao_vivo') {
        // Mesa acabou de ser iniciada pelo Mestre -> abre automaticamente
        navigate({ to: '/jogador/mesa' });
      }
    }
  }, [activeBattleMap?.status, navigate]);

  const mainTabs = [
    { label: 'Mochila', path: '/jogador/mochila', icon: Backpack },
    { label: 'Ficha', path: '/jogador/ficha', icon: User },
    { label: 'Grimório', path: '/jogador/grimorio', icon: BookOpen },
    { label: 'Oficina', path: '/jogador/oficina', icon: Hammer },
    { label: 'Combate', path: '/jogador/combate', icon: Swords },
  ];

  const extraTabs = [
    { label: 'Mesa de Batalha', path: '/jogador/mesa', icon: MapPin },
    { label: 'Árvore do Juramento', path: '/jogador/arvore', icon: GitFork },
    { label: 'Livro de Receitas', path: '/jogador/receitas', icon: BookOpen },
    { label: 'Mapa do Mundo', path: '/jogador/mapa', icon: Compass },
    { label: 'Diário de Bordo', path: '/jogador/diario', icon: FileText },
    { label: 'Missivas', path: '/jogador/missivas', icon: Mail },
    { label: 'Mercado / Loja', path: '/jogador/loja', icon: ShoppingBag },
    { label: 'Rolador de Dados', path: '/jogador/dados', icon: Dices },
  ];

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#08080a] text-[#f5f5f7] overflow-hidden">
      {/* Top Header do Jogador */}
      <header className="h-14 border-b border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f5b65b]/20 border border-[#f5b65b]/40 flex items-center justify-center text-xs font-serif font-bold text-[#f5b65b]">
            {hero?.name ? hero.name.substring(0, 2).toUpperCase() : 'HJ'}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-serif font-semibold text-white tracking-wide leading-tight">
              {hero?.name || 'Herói Selecionado'}
            </span>
            <span className="text-[10px] text-white/50 leading-tight">
              {hero?.title || hero?.race || 'Aventureiro de Aldrenor'}
            </span>
          </div>
        </div>

        {hero && (
          <div className="flex items-center gap-3 w-40">
            <Bar value={hero.health} max={hero.max_health} type="vida" showNumbers={false} />
            <Bar value={hero.focus} max={hero.max_focus} type="foco" showNumbers={false} />
          </div>
        )}
      </header>

      {/* Banner de Batalha Ao Vivo */}
      {isBattleLive && !currentPath.includes('/jogador/mesa') && (
        <Link
          to="/jogador/mesa"
          className="h-10 bg-[#f5b65b]/20 border-b border-[#f5b65b]/40 px-4 flex items-center justify-between text-xs font-serif text-[#ffd59a] hover:bg-[#f5b65b]/30 transition-colors shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f5b65b] animate-ping" />
            <span className="font-semibold">⚔️ Mesa de Batalha Ao Vivo</span>
            <span className="text-white/60 text-[11px] font-sans">
              — O Mestre iniciou o combate
            </span>
          </div>
          <span className="text-[10px] uppercase font-sans tracking-wider text-[#f5b65b] font-bold">
            Entrar no Mapa →
          </span>
        </Link>
      )}

      {/* Área Central / Conteúdo da Aba */}
      <main
        className={`flex-1 flex flex-col relative min-h-0 ${
          currentPath.includes('/jogador/mesa') ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        <Outlet />
      </main>

      {/* Menu 'Mais' Gaveta Modal */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in-0 duration-150">
          <div className="bg-[#141417] border border-white/10 rounded-3xl p-5 shadow-2xl max-w-md w-full mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-serif font-bold text-[#f5b65b] uppercase tracking-wider">
                Outros Módulos
              </h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-lg bg-white/5 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {extraTabs.map((t) => {
                const Icon = t.icon;
                const active = currentPath === t.path;
                return (
                  <Link
                    key={t.path}
                    to={t.path}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#f5b65b]/15 border-[#f5b65b]/40 text-[#ffd59a]'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#f5b65b]" />
                    <span>{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Celular e Tablet) */}
      <nav className="h-16 border-t border-white/[0.08] bg-[#0c0c0e] px-2 flex items-center justify-around shrink-0 safe-bottom">
        {mainTabs.map((t) => {
          const Icon = t.icon;
          const active = currentPath.startsWith(t.path);
          return (
            <Link
              key={t.path}
              to={t.path}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                active ? 'text-[#f5b65b]' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-white/40 hover:text-white/70"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium tracking-tight">Mais</span>
        </button>
      </nav>
    </div>
  );
};
