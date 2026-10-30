import { createFileRoute } from '@tanstack/react-router';
import { PlayerSheetView } from '../../features/sheet';

export const Route = createFileRoute('/jogador/ficha')({
  component: PlayerSheetView,
});
