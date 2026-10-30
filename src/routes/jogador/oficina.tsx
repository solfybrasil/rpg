import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/oficina')({
  component: () => (
    <PlaceholderView
      title="Oficina (Forja, Alquimia & Cozinha)"
      category="Módulo do Jogador · Prompt 07"
      description="Grade 3x3 de síntese, minigames de martelamento e bolhas de alquimia."
    />
  ),
});
