import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mestre/campanha')({
  component: () => (
    <PlaceholderView
      title="Campanha, Crônicas & Cartografia"
      category="Módulo do Mestre · Prompt 19"
      description="Gerenciador de arcos narrativos, crônicas, notas do mestre e marcadores do mapa."
    />
  ),
});
