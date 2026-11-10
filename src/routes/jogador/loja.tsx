import { createFileRoute } from '@tanstack/react-router';
import { PlayerMarketView } from '../../features/market/components/PlayerMarketView';

export const Route = createFileRoute('/jogador/loja')({
  component: PlayerMarketView,
});
