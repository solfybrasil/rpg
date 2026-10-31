import { Link, useRouterState } from '@tanstack/react-router';
import {
  Anvil,
  Backpack,
  BookOpen,
  Dice5,
  Feather,
  Flame,
  Mail,
  MapPin,
  Menu,
  Scroll,
  Sparkles,
  Store,
  User,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { StonePanel } from './StonePanel';

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
    { label: 'Diário', icon: <Feather size={20} />, to: '/jogador/diario' },
  ];

  const moreItems = [
    { label: 'Oficina', icon: <Anvil size={22} />, to: '/jogador/oficina' },
    { label: 'Receitas', icon: <Scroll size={22} />, to: '/jogador/receitas' },
    { label: 'Árvore', icon: <Sparkles size={22} />, to: '/jogador/arvore' },
    { label: 'Mapa', icon: <MapPin size={22} />, to: '/jogador/mapa' },
    { label: 'Missivas', icon: <Mail size={22} />, to: '/jogador/missivas' },
    { label: 'Loja', icon: <Store size={22} />, to: '/jogador/loja' },
    { label: 'Dados', icon: <Dice5 size={22} />, to: '/jogador/dados' },
    { label: 'Combate', icon: <Flame size={22} />, to: '/jogador/combate' },
  ];

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.to));

  return (
    <>
      <nav className="nav-stone">
        {mainTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.to);
          return (
            <Link key={tab.to} to={tab.to} className={isActive ? 'on' : ''}>
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* 5º Botão: Mais */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`cursor-pointer ${isMoreActive || moreOpen ? 'on' : ''}`}
        >
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>

      {/* Sheet de Pedra para 'Mais' */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <StonePanel className="w-full max-w-md mx-auto p-5 border border-[var(--gold-lo)] shadow-2xl relative">
            {/* Header com botão fechar */}
            <div className="flex items-center justify-between border-b border-[var(--iron)] pb-3 mb-4">
              <span className="font-['Cinzel',serif] text-sm font-bold tracking-[0.16em] uppercase text-[var(--gold-hi)]">
                Grimórios, Oficinas & Santuários
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="text-[var(--muted)] hover:text-white p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Grade de 4 colunas com ícones */}
            <div className="grid grid-cols-4 gap-3 py-2">
              {moreItems.map((item) => {
                const isSelected = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center justify-center p-3 border transition-all ${
                      isSelected
                        ? 'border-[var(--gold)] bg-[var(--gold-lo)]/20 text-[var(--gold-hi)]'
                        : 'border-[var(--iron)] bg-black/40 text-[var(--text)] hover:border-[var(--gold-lo)]'
                    }`}
                  >
                    <div className="text-[var(--gold)] mb-1.5">{item.icon}</div>
                    <span className="font-['Cinzel',serif] text-[10px] tracking-[0.1em] uppercase text-center">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </StonePanel>
        </div>
      )}
    </>
  );
};
