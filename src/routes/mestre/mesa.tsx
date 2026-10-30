import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mestre/mesa')({
  component: () => (
    <PlaceholderView
      title="Editor da Mesa de Batalha"
      category="Módulo do Mestre · Prompt 06"
      description="Gerenciador de mapas isométricos, tokens em vídeo, croma key verde/magenta, paredes e transmissão ao vivo."
    />
  ),
});
