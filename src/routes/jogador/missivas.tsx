import { createFileRoute } from '@tanstack/react-router';
import { PlayerMissivesView } from '../../features/missives';

export const Route = createFileRoute('/jogador/missivas')({
  component: PlayerMissivesView,
});
