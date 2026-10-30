import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Grid,
  Package,
  Scroll,
  Settings,
  Shield,
  Skull,
  Sparkles,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export const MestreLayout: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [collapsed, setCollapsed] = useState(false);

  const dmSections = [
    { label: 'Painel dos Jogadores', path: '/mestre/jogadores', icon: Users },
    { label: 'Editor da Mesa', path: '/mestre/mesa', icon: Grid },
    { label: 'Bestiário', path: '/mestre/bestiario', icon: Skull },
    { label: 'Catálogo de Itens', path: '/mestre/itens', icon: Package },
    { label: 'Oficina & Receitas', path: '/mestre/oficina', icon: Sparkles },
    { label: 'Grimórios & Árvores', path: '/mestre/grimorio', icon: BookOpen },
    { label: 'Campanha & Crônicas', path: '/mestre/campanha', icon: Scroll },
    { label: 'Sistema & Códice', path: '/mestre/sistema', icon: Settings },
  ];

  return (
    <div className="flex-1 flex h-full w-full bg-[#08080a] text-[#f5f5f7] overflow-hidden">
      {/* Sidebar Lateral do Mestre */}
      <aside
        className={`border-r border-white/[0.08] bg-[#0c0c0e] flex flex-col transition-all duration-200 shrink-0 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Topo do Mestre */}
        <div className="h-14 border-b border-white/[0.08] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Shield className="w-5 h-5 text-[#f5b65b] shrink-0" />
            {!collapsed && (
              <span className="font-serif font-bold text-sm tracking-wide text-white truncate">
                CONFESSÓRIO
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg hover:bg-white/5 text-white/50 hover:text-white"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Links de navegação */}
        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {dmSections.map((s) => {
            const Icon = s.icon;
            const active = currentPath.startsWith(s.path);
            return (
              <Link
                key={s.path}
                to={s.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#f5b65b]/15 text-[#ffd59a] border border-[#f5b65b]/30'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
                title={collapsed ? s.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0 text-[#f5b65b]" />
                {!collapsed && <span className="truncate">{s.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Conteúdo Central do Mestre */}
      <main className="flex-1 overflow-y-auto flex flex-col relative bg-[#08080a]">
        <Outlet />
      </main>
    </div>
  );
};
