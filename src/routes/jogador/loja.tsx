import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderView } from '../../shared/ui/PlaceholderView.tsx';

export const Route = createFileRoute('/jogador/loja')({
  component: () => (
    <PlaceholderView
      title="Mercado & Mercadorias"
      category="Módulo do Jogador · Prompt 12"
      description="Compra e venda de itens da sessão com conversão automática de moedas (Bronze, Prata, Ouro)."
    />
  ),
});
