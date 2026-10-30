import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mestre/grimorio')({
  component: () => (
    <PlaceholderView
      title="Grimórios, Provações & Árvores"
      category="Módulo do Mestre · Prompt 18"
      description="Editor de magias, gestão de nós de talento da Árvore do Juramento e catálogo de bênçãos."
    />
  ),
});
