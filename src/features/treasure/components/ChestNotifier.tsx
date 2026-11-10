import { Gift } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { availableFor, useChests } from '../api/treasureQuery';

// A janela (animação + ações) só é baixada quando o jogador abre um baú.
const ChestModal = lazy(() => import('./PlayerChests').then((m) => ({ default: m.ChestModal })));

/**
 * Avisa o Jogador quando o Mestre libera um baú para ele (fora do mapa de
 * batalha) e deixa um botão flutuante até esvaziar.
 */
export function PlayerChestNotifier({ heroId, heroName }: { heroId: string | null; heroName: string }) {
  const { chests, missing } = useChests('player');
  const [open, setOpen] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const mine = useMemo(() => {
    if (!heroId) return [];
    return chests.filter((c) => {
      if (c.map_token_id) return false;
      const a = availableFor(c, heroId);
      return a.items.length > 0 || a.coins > 0;
    });
  }, [chests, heroId]);

  // Aviso só para baús que chegaram depois de abrir o app
  useEffect(() => {
    if (!heroId) return;
    if (!seen.current) {
      seen.current = new Set(mine.map((c) => c.id));
      return;
    }
    for (const c of mine) {
      if (seen.current.has(c.id)) continue;
      seen.current.add(c.id);
      toast(`${c.name} para você!`, {
        description: 'O Mestre deixou um baú. Abra antes que outro jurado leve tudo.',
        action: { label: 'Abrir', onClick: () => setOpen(c.id) },
        duration: 8000,
      });
    }
  }, [mine, heroId]);

  if (missing || !heroId) return null;
  return (
    <>
      {mine.length > 0 && !open && (
        <button
          type="button"
          onClick={() => setOpen(mine[0].id)}
          data-testid="chest-fab"
          aria-label={`Abrir baú (${mine.length})`}
          className="absolute right-3 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-40 h-11 pl-2 pr-3 flex items-center gap-2 border border-[var(--gold)] bg-[var(--stone)] text-[var(--gold-hi)] shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_14px_rgba(201,164,92,0.35)] cursor-pointer active:translate-y-px animate-[fadeIn_var(--t-base)_var(--ease-out)]"
        >
          <Gift className="w-5 h-5" />
          <span className="font-['Cinzel',serif] text-xs tracking-[0.1em]">Baú{mine.length > 1 ? ` ×${mine.length}` : ''}</span>
        </button>
      )}
      {open && heroId && (
        <Suspense fallback={null}>
          <ChestModal chestId={open} heroId={heroId} heroName={heroName} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </>
  );
}
