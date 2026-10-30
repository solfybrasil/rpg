import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mestre/bestiario')({
  component: () => (
    <PlaceholderView
      title="Bestiário & Criaturas"
      category="Módulo do Mestre · Prompt 15"
      description="Catálogo de feras, estatísticas de combate, comportamento de IA, ataques e cálculo de despojos."
    />
  ),
});
