import { createFileRoute } from '@tanstack/react-router';
import { PlayerOathTreeView } from '../../features/oath-tree';

export const Route = createFileRoute('/jogador/arvore')({
  component: PlayerOathTreeView,
});
