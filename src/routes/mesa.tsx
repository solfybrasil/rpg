import { createFileRoute } from '@tanstack/react-router';
import { TvLayout } from '../shared/layouts/TvLayout.tsx';
import { PlaceholderView } from '../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mesa')({
  component: () => (
    <TvLayout>
      <PlaceholderView
        title="Mesa de Batalha & Dados 3D"
        category="Módulo TV / Mesa · Prompt 21"
        description="Transmissão ao vivo do mapa tático com dados e timer para toda a mesa."
      />
    </TvLayout>
  ),
});
