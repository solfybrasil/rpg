import { createFileRoute } from '@tanstack/react-router';
import { WorldMapView } from '../../features/world-map';
import { useSessionStore } from '../../shared/stores/session';

export const Route = createFileRoute('/jogador/mapa')({
  component: PlayerMapRoute,
});

function PlayerMapRoute() {
  const heroId = useSessionStore((s) => s.heroId) || 'teste_1';
  return <WorldMapView userRole="player" sessionCode="MESA" playerId={heroId} />;
}
