import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/mochila')({
  component: () => (
    <PlaceholderView
      title="Mochila & Inventário"
      category="Módulo do Jogador · Prompt 03"
      description="Grade 40 slots, arrastar e soltar com @dnd-kit, envio entre jogadores, moedas e descarte."
    />
  ),
});
