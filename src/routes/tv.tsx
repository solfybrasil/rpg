import { Link, createFileRoute } from '@tanstack/react-router';
import { TvLayout } from '../shared/layouts/TvLayout.tsx';

export const Route = createFileRoute('/tv')({
  component: () => (
    <TvLayout>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 text-3xl mb-4">
          📺
        </div>
        <h1 className="font-heading text-3xl text-amber-200 tracking-wider mb-2">
          CENTRAL DA TV & PROJETOR
        </h1>
        <p className="text-stone-400 max-w-md text-sm mb-8">
          Selecione a transmissão em tela cheia para a TV da sala ou monitor dos jogadores:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl w-full">
          <Link
            to="/batalha"
            className="flex flex-col items-center p-6 rounded-xl bg-stone-900/90 border border-amber-500/30 hover:border-amber-400 hover:bg-stone-800/90 transition shadow-xl group"
          >
            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🗺️</span>
            <span className="font-heading text-lg font-bold text-amber-100 mb-1">
              Mapa de Batalha (/batalha)
            </span>
            <span className="text-xs text-stone-400">
              Grade isométrica, tokens em vídeo, alcance e névoa da sessão.
            </span>
          </Link>

          <Link
            to="/mesa"
            className="flex flex-col items-center p-6 rounded-xl bg-stone-900/90 border border-amber-500/30 hover:border-amber-400 hover:bg-stone-800/90 transition shadow-xl group"
          >
            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎲</span>
            <span className="font-heading text-lg font-bold text-amber-100 mb-1">
              Mesa de Dados & Timer (/mesa)
            </span>
            <span className="text-xs text-stone-400">
              Rolagens 3D compartilhadas, cronômetro de turno e turnos da rodada.
            </span>
          </Link>
        </div>

        <div className="mt-8">
          <Link
            to="/"
            className="text-xs text-stone-500 hover:text-stone-300 underline underline-offset-4"
          >
            ← Voltar ao Santuário Inicial
          </Link>
        </div>
      </div>
    </TvLayout>
  ),
});
