import { createFileRoute } from '@tanstack/react-router';
import { PlayerShopView } from '../../features/shop';

export const Route = createFileRoute('/jogador/loja')({
  component: PlayerShopView,
});
