import { createFileRoute } from '@tanstack/react-router';
import { PlayerInventoryView } from '../../features/inventory/components/PlayerInventoryView';

export const Route = createFileRoute('/jogador/mochila')({
  component: PlayerInventoryView,
});
