import { createFileRoute } from '@tanstack/react-router';
import { PlayerWorkshopView } from '../../features/workshop/components/PlayerWorkshopView';

export const Route = createFileRoute('/jogador/oficina')({
  component: PlayerWorkshopView,
});
