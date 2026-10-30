import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mestre/jogadores')({
  component: () => (
    <PlaceholderView
      title="Painel dos Jogadores"
      category="Módulo do Mestre · Prompt 02"
      description="Monitoramento ao vivo de vida, foco, condições, inventário e ações dos heróis em tempo real."
    />
  ),
});
