import { createFileRoute } from '@tanstack/react-router';
import { TvLayout } from '../shared/layouts/TvLayout.tsx';
import { PlaceholderView } from '../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/tv')({
  component: () => (
    <TvLayout>
      <PlaceholderView
        title="Exibição TV da Mesa"
        category="Módulo TV · Prompt 21"
        description="Tela limpa para TV/Projetor com visualização dos dados rolados em 3D, cronômetro de combate e mesa tática."
      />
    </TvLayout>
  ),
});
