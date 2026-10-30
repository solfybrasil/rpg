import { createFileRoute } from '@tanstack/react-router';
import { TVBattleCanvas } from '../features/battle-map/components/TVBattleCanvas.tsx';

export const Route = createFileRoute('/batalha')({
  component: TVBattleCanvas,
});
