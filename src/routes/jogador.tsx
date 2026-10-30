import { createFileRoute } from '@tanstack/react-router';
import { JogadorLayout } from '../shared/layouts/JogadorLayout.tsx';

export const Route = createFileRoute('/jogador')({
  component: JogadorLayout,
});
