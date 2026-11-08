/**
 * MestreLayout.tsx
 * Estrutura copiada de confessor_mestre_elden_ring.html:
 *   .topbar > .brand + .nav buttons + .top-actions
 * Usa as classes do src/styles/mestre.css sem alteração.
 */
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import '../../styles/mestre.css';
import '../../styles/mestre-theme.css';

const DM_SECTIONS = [
  { label: '♙ Jurados', path: '/mestre/jogadores', key: '1' },
  { label: '♜ Mesa', path: '/mestre/mesa', key: '2' },
  { label: '♞ Bestiário', path: '/mestre/bestiario', key: '3' },
  { label: '⚒ Itens', path: '/mestre/itens', key: '4' },
  { label: '⚒ Oficina', path: '/mestre/oficina', key: '5' },
  { label: '▤ Grimórios', path: '/mestre/grimorio', key: '6' },
  { label: '▧ Crônicas', path: '/mestre/campanha', key: '7' },
  { label: '⚙ Sistema', path: '/mestre/sistema', key: '8' },
] as const;

export const MestreLayout: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();

  const currentIndex = useMemo(
    () => DM_SECTIONS.findIndex((s) => currentPath.startsWith(s.path)),
    [currentPath],
  );

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Navegação por teclado Q / E e 1-8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const idx = currentIndexRef.current;
      if (e.key === 'q' || e.key === 'Q') {
        const prevIdx = idx <= 0 ? DM_SECTIONS.length - 1 : idx - 1;
        navigate({ to: DM_SECTIONS[prevIdx].path });
      } else if (e.key === 'e' || e.key === 'E') {
        const nextIdx = idx >= DM_SECTIONS.length - 1 ? 0 : idx + 1;
        navigate({ to: DM_SECTIONS[nextIdx].path });
      } else if (e.key >= '1' && e.key <= '8') {
        const kIdx = parseInt(e.key) - 1;
        if (DM_SECTIONS[kIdx]) navigate({ to: DM_SECTIONS[kIdx].path });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]); // Only re-subscribe when navigate changes

  return (
    /* .mestre-root envolve tudo: garante as CSS vars e a base visual */
    <div
      className="mestre-root"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── .topbar: copiado do HTML fonte ── */}
      <header className="topbar">
        {/* .brand */}
        <div className="brand">
          <div className="brand-mark">✧</div>
          <div className="brand-name">
            O Confessório
            <small>do Mestre</small>
          </div>
        </div>

        {/* .nav com Links React Router */}
        <nav className="nav" aria-label="Navegação principal">
          {DM_SECTIONS.map((s) => {
            const isActive = currentPath.startsWith(s.path);
            return (
              <Link
                key={s.path}
                to={s.path}
                className={isActive ? 'active' : ''}
                style={{ textDecoration: 'none' }}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        {/* .top-actions */}
        <div className="top-actions">
          <button className="icon-btn" type="button" aria-label="Configurações" title="Sistema">
            ⚙
          </button>
          <button className="icon-btn" type="button" aria-label="Atalhos de teclado" title="Q/E para navegar">
            ⌨
          </button>
        </div>
      </header>

      {/* Conteúdo de cada rota do mestre: estica até o rodapé e rola por dentro */}
      <div className="mestre-content" style={{ contain: 'layout' }}>
        <Outlet />
      </div>
    </div>
  );
};
