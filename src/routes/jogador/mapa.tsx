import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/mapa')({
  component: () => (
    <PlaceholderView
      title="Mapa do Continente"
      category="Módulo do Jogador · Prompt 13"
      description="Cartografia de Aldrenor, névoa de guerra, marcadores e visualização geográfica."
    />
  ),
});
