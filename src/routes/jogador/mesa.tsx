import { createFileRoute } from '@tanstack/react-router';
import { PlayerBattleCanvas } from '../../features/battle-map/components/PlayerBattleCanvas.tsx';

export const Route = createFileRoute('/jogador/mesa')({
  component: PlayerBattleCanvas,
});
