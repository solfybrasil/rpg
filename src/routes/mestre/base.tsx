import { createFileRoute } from '@tanstack/react-router';
import { DMBaseView } from '../../features/base/components/DMBaseView';

export const Route = createFileRoute('/mestre/base')({
  component: DMBaseRoute,
});

function DMBaseRoute() {
  return (
    <div className="relative w-full" style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
      <DMBaseView />
    </div>
  );
}
