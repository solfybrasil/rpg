import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mestre/itens')({
  component: () => (
    <PlaceholderView
      title="Catálogo Geral de Itens"
      category="Módulo do Mestre · Prompt 16"
      description="Listagem e criação de armas, armaduras, consumíveis, materiais e relíquias do mundo."
    />
  ),
});
