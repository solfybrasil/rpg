import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/diario')({
  component: () => (
    <PlaceholderView
      title="Diário de Bordo"
      category="Módulo do Jogador · Prompt 12"
      description="Anotações pessoais do herói com salvamento automático."
    />
  ),
});
