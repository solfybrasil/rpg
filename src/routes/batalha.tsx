import { createFileRoute } from '@tanstack/react-router';
import { TvLayout } from '../shared/layouts/TvLayout.tsx';
import { PlaceholderView } from '../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/batalha')({
  component: () => (
    <TvLayout>
      <PlaceholderView
        title="Mesa de Batalha (TV)"
        category="Módulo TV / Mapa Tático · Prompt 05 & 21"
        description="Transmissão em tela cheia do mapa de batalha tático em tempo real para TV/Projetor."
      />
    </TvLayout>
  ),
});
