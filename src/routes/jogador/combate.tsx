import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/combate')({
  component: () => (
    <PlaceholderView
      title="Combate por Turnos & Arena"
      category="Módulo de Combate · Prompt 09"
      description="Ordem de iniciativa, ataques com fórmulas dinâmicas, uso de itens e registro de danos."
    />
  ),
});
