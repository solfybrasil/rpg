import { createFileRoute } from '@tanstack/react-router';
import { MesaView } from '../features/mesa';
import { TvLayout } from '../shared/layouts/TvLayout.tsx';

export const Route = createFileRoute('/mesa')({
  component: () => (
    <TvLayout>
      <MesaView />
    </TvLayout>
  ),
});
