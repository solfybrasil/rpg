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
  { label: '⚙ Sistema', path: '/mestre/sistema', key: '7' },
] as const;

function isActive(currentPath: string, itemPath: string) {
  // "/mestre" (índice) mostra o painel de jurados.
  if (itemPath === '/mestre/jogadores' && (currentPath === '/mestre' || currentPath === '/mestre/'))
    return true;
  return currentPath.startsWith(itemPath);
}

export const MestreLayout: React.FC = () => {
  // Só re-renderiza quando o caminho muda (não a cada evento do roteador).
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const currentIndex = useMemo(
    () => DM_SECTIONS.findIndex((s) => isActive(currentPath, s.path)),
    [currentPath],
  );

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Navegação por teclado: Q / E (anterior/próxima) e 1-7
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      )
        return;
      // Com um modal aberto, as teclas pertencem ao modal.
      if (document.querySelector('[role="dialog"]')) return;
      const idx = currentIndexRef.current;
      if (e.key === 'q' || e.key === 'Q') {
        const prevIdx = idx <= 0 ? DM_SECTIONS.length - 1 : idx - 1;
        navigate({ to: DM_SECTIONS[prevIdx].path });
      } else if (e.key === 'e' || e.key === 'E') {
        const nextIdx = idx >= DM_SECTIONS.length - 1 ? 0 : idx + 1;
        navigate({ to: DM_SECTIONS[nextIdx].path });
      } else if (e.key >= '1' && e.key <= String(DM_SECTIONS.length)) {
        const kIdx = Number.parseInt(e.key) - 1;
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
            const active = isActive(currentPath, s.path);
            return (
              <Link
                key={s.path}
                to={s.path}
                title={`${s.label.slice(2)} (${s.key})`}
                className={active ? 'active' : ''}
                style={{ textDecoration: 'none' }}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Conteúdo de cada rota do mestre: estica até o rodapé e rola por dentro */}
      <div className="mestre-content" style={{ contain: 'layout' }}>
        <Outlet />
      </div>
    </div>
  );
};
