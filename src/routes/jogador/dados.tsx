import { createFileRoute } from '@tanstack/react-router';
import { PlayerDiceView } from '../../features/dice';

export const Route = createFileRoute('/jogador/dados')({
  component: PlayerDiceView,
});
