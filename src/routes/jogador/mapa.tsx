import { createFileRoute } from '@tanstack/react-router';
import { WorldMapScreen } from '../../features/world-map/components/WorldMapScreen';
import { useSessionStore } from '../../shared/stores/session';

export const Route = createFileRoute('/jogador/mapa')({
  component: PlayerMapRoute,
});

function PlayerMapRoute() {
  const heroId = useSessionStore((s) => s.heroId) || 'teste_1';
  return (
    <div className="relative w-full h-[calc(100dvh-132px)] min-h-[420px] overflow-hidden">
      <WorldMapScreen role="player" playerId={heroId} />
    </div>
  );
}
