import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/ficha')({
  component: () => (
    <PlaceholderView
      title="Ficha do Personagem"
      category="Módulo do Jogador · Prompt 04"
      description="Atributos canônicos, perícias, barras de vida/foco e evolução de nível."
    />
  ),
});
