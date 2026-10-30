import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/arvore')({
  component: () => (
    <PlaceholderView
      title="Árvore do Juramento"
      category="Módulo do Jogador · Prompt 11"
      description="Grafo de talentos, nós desbloqueados, cálculo de bônus cumulativos de vida, foco e perícias."
    />
  ),
});
