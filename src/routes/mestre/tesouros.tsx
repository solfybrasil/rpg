import { createFileRoute } from '@tanstack/react-router';
import { DMTreasureView } from '../../features/treasure/components/DMTreasureView';

export const Route = createFileRoute('/mestre/tesouros')({
  component: DMTreasureRoute,
});

function DMTreasureRoute() {
  return (
    <div className="relative w-full flex" style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
      <DMTreasureView />
    </div>
  );
}
