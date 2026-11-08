import { Link, useRouterState } from '@tanstack/react-router';
import {
  Anvil,
  Backpack,
  BookOpen,
  MapPin,
  Menu,
  Scroll,
  Sparkles,
  Store,
  User,
} from 'lucide-react';
import { m } from 'motion/react';
import React, { useState } from 'react';
import { MoreSheet } from './MoreSheet';

export interface BottomNavProps {
  activeTab?: string;
}

export const BottomNav: React.FC<BottomNavProps> = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const mainTabs = [
    { label: 'Ficha', icon: <User size={20} />, to: '/jogador/ficha' },
    { label: 'Mochila', icon: <Backpack size={20} />, to: '/jogador/mochila' },
    { label: 'Grimório', icon: <BookOpen size={20} />, to: '/jogador/grimorio' },
    { label: 'Árvore', icon: <Sparkles size={20} />, to: '/jogador/arvore' },
  ];

  const moreItems = [
    { label: 'Oficina', icon: <Anvil size={22} />, to: '/jogador/oficina' },
    { label: 'Receitas', icon: <Scroll size={22} />, to: '/jogador/receitas' },
    { label: 'Mapa', icon: <MapPin size={22} />, to: '/jogador/mapa' },
    { label: 'Loja', icon: <Store size={22} />, to: '/jogador/loja' },
  ];

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.to));

  return (
    <>
      <nav className="nav-stone">
        {mainTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.to);
          return (
            <Link key={tab.to} to={tab.to} className={`relative ${isActive ? 'on' : ''}`}>
              {isActive && (
                <m.div
                  layoutId="bottom-nav-diamond"
                  className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] bg-[var(--gold)] rotate-45 shadow-[0_0_8px_rgba(236,211,149,0.8)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* 5º Botão: Mais */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`cursor-pointer relative ${isMoreActive || moreOpen ? 'on' : ''}`}
        >
          {(isMoreActive || moreOpen) && (
            <m.div
              layoutId="bottom-nav-diamond"
              className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] bg-[var(--gold)] rotate-45 shadow-[0_0_8px_rgba(236,211,149,0.8)]"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>

      {/* Sheet de Pedra para 'Mais' com ícones em cascata */}
      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} items={moreItems} />
    </>
  );
};
