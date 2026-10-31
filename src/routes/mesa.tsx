import { createFileRoute } from '@tanstack/react-router';
import { TvLayout } from '../shared/layouts/TvLayout.tsx';
import { MesaView } from '../features/mesa';

export const Route = createFileRoute('/mesa')({
  component: () => (
    <TvLayout>
      <MesaView />
    </TvLayout>
  ),
});
