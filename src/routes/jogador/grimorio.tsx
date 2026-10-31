import { createFileRoute } from '@tanstack/react-router';
import { PlayerGrimoireView } from '../../features/grimoire';

export const Route = createFileRoute('/jogador/grimorio')({
  component: PlayerGrimoireView,
});
