import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/dados')({
  component: () => (
    <PlaceholderView
      title="Rolador de Dados"
      category="Módulo do Jogador · Prompt 12"
      description="Rolador de 2d6 com modificadores e transmissão em tempo real para a TV da mesa."
    />
  ),
});
