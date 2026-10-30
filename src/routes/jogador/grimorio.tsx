import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/grimorio')({
  component: () => (
    <PlaceholderView
      title="Grimório de Magias"
      category="Módulo do Jogador · Prompt 11"
      description="Círculos arcanos, filtros por afinidade, custo de Foco e conjuração em batalha."
    />
  ),
});
