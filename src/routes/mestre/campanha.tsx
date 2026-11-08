import { createFileRoute, redirect } from '@tanstack/react-router';

// Crônicas ainda não têm armazenamento real; a rota antiga leva ao painel de jogadores.
export const Route = createFileRoute('/mestre/campanha')({
  beforeLoad: () => {
    throw redirect({ to: '/mestre/jogadores' });
  },
});
