import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/mestre/oficina')({
  component: () => (
    <PlaceholderView
      title="Controle da Oficina, Receitas & Loja"
      category="Módulo do Mestre · Prompt 17"
      description="Gerenciador de receitas da forja, caldeirão e estoque disponível para mercadores."
    />
  ),
});
