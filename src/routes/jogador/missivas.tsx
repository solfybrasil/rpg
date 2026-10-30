import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/missivas')({
  component: () => (
    <PlaceholderView
      title="Missivas & Correspondências"
      category="Módulo do Jogador · Prompt 12"
      description="Cartas secretas enviadas pelo Mestre com status de lida/não-lida."
    />
  ),
});
