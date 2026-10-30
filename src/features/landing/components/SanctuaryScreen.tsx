import { Crown, Sparkles, Tv } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useSessionStore } from '../../../shared/stores/session';
import { HEROES_SANCTUARY_DATA, type SanctuaryHero } from '../constants';
import { EldenEmbersCanvas } from './EldenEmbersCanvas';
import { SanctuaryEyeCanvas } from './SanctuaryEyeCanvas';

export function SanctuaryScreen() {
  const navigate = useNavigate();
  const { role, heroId, selectHero, enterAsDM } = useSessionStore();

  const handleSelectHero = (id: string) => {
    selectHero(id);
    navigate({ to: '/jogador/mochila' });
  };

  const handleEnterDM = () => {
    enterAsDM();
    navigate({ to: '/mestre' });
  };

  const lastHero = HEROES_SANCTUARY_DATA.find((h) => h.id === heroId);

  return (
    <div className="relative min-h-screen bg-[#0d0907] text-stone-200 overflow-x-hidden selection:bg-amber-900/60 selection:text-amber-200">
      {/* Brasas incandescentes em canvas leve de fundo */}
      <EldenEmbersCanvas count={22} color="230, 160, 60" />

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Olho místico animado no topo */}
        <div className="relative mb-2 flex flex-col items-center">
          <SanctuaryEyeCanvas className="mb-[-15px]" />
          <div
            className="text-amber-500/80 text-3xl select-none"
            title="Selo Sagrado de Peste do Juramento"
          >
            ⚜
          </div>
        </div>

        {/* Título & Lema */}
        <header className="text-center mb-8 sm:mb-10 max-w-2xl">
          <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-[0.14em] text-amber-100 uppercase drop-shadow-[0_2px_12px_rgba(201,169,97,0.25)]">
            PESTE DO JURAMENTO
          </h1>
          <p className="mt-2 text-stone-400 font-serif italic text-sm sm:text-base leading-relaxed">
            "Toda palavra jurada é uma dívida com o próprio corpo."
          </p>

          {/* Banner de Retorno Rápido (Lembrar último papel) */}
          {role && (
            <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-amber-950/40 border border-amber-600/40 text-xs sm:text-sm text-amber-200 backdrop-blur-sm shadow-lg animate-in fade-in">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>
                Última sessão:{' '}
                <strong className="text-amber-100">
                  {role === 'mestre' ? 'Mestre da Mesa' : lastHero?.name || 'Jogador'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  role === 'mestre' ? handleEnterDM() : handleSelectHero(heroId || 'tor_bjorn')
                }
                className="ml-2 font-heading font-semibold text-amber-300 underline underline-offset-4 hover:text-white transition"
              >
                Continuar →
              </button>
            </div>
          )}
        </header>

        {/* Grid dos 4 Papéis: 3 Heróis + 1 Mestre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
          {/* CARDS DOS 3 HERÓIS */}
          {HEROES_SANCTUARY_DATA.map((hero: SanctuaryHero) => {
            const isLastSelected = role === 'jogador' && heroId === hero.id;

            return (
              <div
                key={hero.id}
                onClick={() => handleSelectHero(hero.id)}
                className={`group flex flex-col justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 border bg-gradient-to-b from-[#1c140f]/95 to-[#100b08]/98 shadow-[0_12px_32px_rgba(0,0,0,0.7)] ${
                  isLastSelected
                    ? 'border-amber-500 shadow-[0_0_20px_rgba(201,169,97,0.3)] ring-1 ring-amber-500/50'
                    : 'border-[#8c6941]/40 hover:border-amber-500/80 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.9)]'
                }`}
              >
                <div>
                  {/* Retrato */}
                  <div className="relative w-full h-52 rounded-lg overflow-hidden mb-3 border border-[#8c6941]/40 bg-[#140e0a]">
                    <img
                      src={hero.portrait}
                      alt={hero.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#100b08] via-transparent to-transparent opacity-80" />
                    {isLastSelected && (
                      <span className="absolute top-2 right-2 text-[10px] font-heading uppercase px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold tracking-wider shadow">
                        Último
                      </span>
                    )}
                  </div>

                  {/* Nome & Epíteto */}
                  <div className="mb-2">
                    <h2 className="font-heading text-lg font-bold text-amber-200 group-hover:text-amber-100 transition-colors">
                      {hero.name}
                    </h2>
                    <p className="font-heading text-xs text-amber-500/90 tracking-wide">
                      {hero.epithet}
                    </p>
                  </div>

                  {/* Badges de Caminho & Raça */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[11px] font-heading px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200">
                      {hero.caminho}
                    </span>
                    <span className="text-[11px] font-heading px-2 py-0.5 rounded bg-stone-800/80 border border-stone-700/60 text-stone-300">
                      {hero.race}
                    </span>
                  </div>

                  {/* Juramento */}
                  <div className="p-2.5 rounded-r border-l-2 border-[#8c6941] bg-black/40 text-[11px] font-serif italic text-stone-400 leading-snug mb-4">
                    "{hero.oath}"
                  </div>
                </div>

                {/* Botão de Entrada */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectHero(hero.id);
                  }}
                  className="w-full py-2.5 px-3 rounded-md font-heading font-bold text-xs uppercase tracking-wider text-amber-100 bg-gradient-to-b from-[#8f2a24] to-[#601a16] border border-[#a83832] hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>⚔️</span>
                  <span>{hero.btnLabel}</span>
                </button>
              </div>
            );
          })}

          {/* CARD 4: O MESTRE */}
          <div
            onClick={handleEnterDM}
            className={`group flex flex-col justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 border bg-gradient-to-b from-[#1c140f]/95 to-[#100b08]/98 shadow-[0_12px_32px_rgba(0,0,0,0.7)] ${
              role === 'mestre'
                ? 'border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.35)] ring-1 ring-amber-400/50'
                : 'border-amber-600/40 hover:border-amber-400 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.9)]'
            }`}
          >
            <div>
              {/* Header Mestre */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg border border-amber-500/60 bg-amber-500/15 flex items-center justify-center text-amber-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-amber-100">O Mestre</h2>
                  <p className="font-heading text-xs text-amber-400 tracking-wide">
                    Confessor da Mesa
                  </p>
                </div>
              </div>

              {/* Badges Mestre */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] font-heading px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold">
                  Narrador & Juiz
                </span>
                <span className="text-[11px] font-heading px-2 py-0.5 rounded bg-stone-800/80 border border-stone-700/60 text-stone-300">
                  Acesso Imediato
                </span>
              </div>

              {/* Descrição */}
              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                Governe o altar da mesa, orquestre os Atos da peste, julgue os votos sagrados, forje
                relíquias e conduza a narrativa viva com controle absoluto.
              </p>
            </div>

            {/* Botão de Entrada Mestre */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEnterDM();
              }}
              className="w-full py-2.5 px-3 rounded-md font-heading font-bold text-xs uppercase tracking-wider text-[#fff9e6] bg-gradient-to-b from-[#9e782f] to-[#785a1a] border border-[#d4af37] hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>⚜</span>
              <span>Entrar como Mestre</span>
            </button>
          </div>
        </div>

        {/* Barra Inferior com Atalhos da TV e Transmissão */}
        <footer className="mt-12 pt-6 border-t border-stone-800/70 w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-amber-500/70" />
            <span className="text-stone-400 font-heading">Transmissão para Telão & TV:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/batalha"
              className="px-3 py-1.5 rounded-md bg-stone-900 border border-amber-500/30 hover:border-amber-400 text-stone-300 hover:text-amber-200 transition font-heading flex items-center gap-1.5"
            >
              <span>🗺️</span>
              <span>/batalha (Mapa TV)</span>
            </Link>
            <Link
              to="/mesa"
              className="px-3 py-1.5 rounded-md bg-stone-900 border border-amber-500/30 hover:border-amber-400 text-stone-300 hover:text-amber-200 transition font-heading flex items-center gap-1.5"
            >
              <span>🎲</span>
              <span>/mesa (Dados TV)</span>
            </Link>
            <Link
              to="/tv"
              className="px-3 py-1.5 rounded-md bg-stone-900 border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-stone-200 transition font-heading"
            >
              Central TV
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
