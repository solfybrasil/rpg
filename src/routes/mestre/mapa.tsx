import { createFileRoute } from '@tanstack/react-router';
import { WorldMapScreen } from '../../features/world-map/components/WorldMapScreen';

export const Route = createFileRoute('/mestre/mapa')({
  component: DMMapRoute,
});

function DMMapRoute() {
  return (
    <div className="relative w-full" style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
      <WorldMapScreen role="dm" playerId="mestre" />
    </div>
  );
}
