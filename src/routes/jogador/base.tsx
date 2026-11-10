import { createFileRoute } from '@tanstack/react-router';
import { PlayerBaseView } from '../../features/base/components/PlayerBaseView';
import { useSessionStore } from '../../shared/stores/session';

export const Route = createFileRoute('/jogador/base')({
  component: PlayerBaseRoute,
});

function PlayerBaseRoute() {
  const heroId = useSessionStore((s) => s.heroId) || 'teste_1';
  return (
    <div className="relative w-full h-[calc(100dvh-132px)] min-h-[420px] overflow-hidden">
      <PlayerBaseView heroId={heroId} />
    </div>
  );
}
