import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/receitas')({
  component: () => (
    <PlaceholderView
      title="Livro de Receitas"
      category="Módulo do Jogador · Prompt 08"
      description="Catálogo de receitas descobertas para Forja, Alquimia e Cozinha."
    />
  ),
});
