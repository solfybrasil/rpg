import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Grid,
  type LucideIcon,
  Package,
  Settings,
  Skull,
  Sparkles,
  Users,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Sessão',
    items: [
      { label: 'Jogadores', path: '/mestre/jogadores', icon: Users },
      { label: 'Mesa', path: '/mestre/mesa', icon: Grid },
    ],
  },
  {
    title: 'Conteúdo',
    items: [
      { label: 'Bestiário', path: '/mestre/bestiario', icon: Skull },
      { label: 'Itens', path: '/mestre/itens', icon: Package },
      { label: 'Oficina', path: '/mestre/oficina', icon: Sparkles },
      { label: 'Grimórios', path: '/mestre/grimorio', icon: BookOpen },
    ],
  },
  {
    title: 'Ajustes',
    items: [{ label: 'Sistema', path: '/mestre/sistema', icon: Settings }],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const COLLAPSE_KEY = 'mestre.sidebar.collapsed';

function isActive(currentPath: string, itemPath: string) {
  // "/mestre" (índice) mostra o painel de jogadores.
  if (itemPath === '/mestre/jogadores' && (currentPath === '/mestre' || currentPath === '/mestre/'))
    return true;
  return currentPath.startsWith(itemPath);
}

export const MestreLayout = () => {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        // armazenamento indisponível: só não persiste
      }
      return !c;
    });
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full min-h-0 bg-[var(--abyss)] text-[var(--text)] overflow-hidden">
      {/* Navegação lateral (desktop/tablet) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-[var(--iron)] bg-[var(--stone)] transition-[width] duration-200 ${
          collapsed ? 'w-14' : 'w-52'
        }`}
      >
        <div
          className={`h-12 flex items-center px-3 border-b border-[var(--iron)] ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && (
            <span className="font-['Cinzel',serif] text-xs font-bold tracking-[0.2em] uppercase text-[var(--gold-hi)]">
              Mestre
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-3">
              {!collapsed && (
                <p className="px-4 pb-1 font-['Cinzel',serif] text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]/70">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(currentPath, item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center gap-3 h-9 text-[13px] ${
                      collapsed ? 'justify-center' : 'px-4'
                    } ${
                      active
                        ? 'bg-[var(--stone-2)] text-[var(--gold-hi)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/25'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--gold)]" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--gold)]' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Navegação superior (celular) */}
      <nav className="md:hidden flex shrink-0 overflow-x-auto border-b border-[var(--iron)] bg-[var(--stone)]">
        {ALL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(currentPath, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[4.5rem] h-12 px-2 text-[10px] ${
                active
                  ? 'text-[var(--gold-hi)] shadow-[inset_0_-2px_0_var(--gold)]'
                  : 'text-[var(--muted)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col relative">
        <Outlet />
      </main>
    </div>
  );
};
