import { Link, useNavigate } from '@tanstack/react-router';
import { Crown, Sparkles, Sword, Tv } from 'lucide-react';
import { useSessionStore } from '../../../shared/stores/session';
import { EmberField } from '../../../shared/ui/EmberField';
import { StonePanel } from '../../../shared/ui/StonePanel';
import { HEROES_SANCTUARY_DATA, type SanctuaryHero } from '../constants';

export function SanctuaryScreen() {
  const navigate = useNavigate();
  const { role, heroId, selectHero, enterAsDM } = useSessionStore();

  const handleSelectHero = (id: string) => {
    selectHero(id);
    navigate({ to: '/jogador/ficha' });
  };

  const handleEnterDM = () => {
    enterAsDM();
    navigate({ to: '/mestre' });
  };

  const lastHero = HEROES_SANCTUARY_DATA.find((h) => h.id === heroId);

  return (
    <div className="relative min-h-screen bg-[var(--abyss)] text-[var(--text)] overflow-x-hidden selection:bg-[var(--gold-lo)] selection:text-[var(--gold-hi)] font-['EB_Garamond',serif]">
      {/* Brasas incandescentes em canvas leve de fundo */}
      <EmberField particleCount={32} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Selo Rúnico no topo */}
        <div className="relative mb-2 flex flex-col items-center select-none">
          <div className="w-12 h-12 flex items-center justify-center text-[var(--gold)] text-3xl font-['Cinzel',serif] border border-[var(--gold-lo)] slab">
            ⚜
          </div>
        </div>

        {/* Título & Lema */}
        <header className="text-center mb-8 sm:mb-10 max-w-2xl">
          <h1 className="font-['Cinzel',serif] text-3xl sm:text-5xl font-bold tracking-[0.14em] text-[var(--gold-hi)] uppercase drop-shadow-[0_2px_12px_rgba(201,164,92,0.25)]">
            PESTE DO JURAMENTO
          </h1>
          <p className="mt-2 text-[var(--muted)] font-['EB_Garamond',serif] italic text-sm sm:text-base leading-relaxed">
            "Toda palavra jurada é uma dívida com o próprio corpo."
          </p>

          {/* Banner de Retorno Rápido */}
          {role && (
            <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 slab border border-[var(--gold-lo)] text-xs text-[var(--gold-hi)] shadow-lg animate-in fade-in">
              <Sparkles className="w-4 h-4 text-[var(--gold)] animate-pulse" />
              <span>
                Última sessão:{' '}
                <strong className="text-[var(--gold-hi)] font-['Cinzel',serif]">
                  {role === 'mestre' ? 'Mestre da Mesa' : lastHero?.name || 'Jogador'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  role === 'mestre' ? handleEnterDM() : handleSelectHero(heroId || 'tor_bjorn')
                }
                className="ml-2 font-['Cinzel',serif] font-bold text-[var(--gold-hi)] uppercase underline underline-offset-4 hover:brightness-125 transition cursor-pointer"
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
              <StonePanel
                key={hero.id}
                onClick={() => handleSelectHero(hero.id)}
                className={`group flex flex-col justify-between p-4 cursor-pointer transition-all duration-200 border select-none ${
                  isLastSelected
                    ? 'border-[var(--gold)] shadow-[0_0_20px_rgba(201,164,92,0.3)]'
                    : 'border-[var(--iron)] hover:border-[var(--gold-lo)] hover:-translate-y-1'
                }`}
              >
                <div>
                  {/* Retrato */}
                  <div className="relative w-full h-52 overflow-hidden mb-3 border border-[var(--gold-lo)]/60 bg-[#0d0b0a]">
                    <img
                      src={hero.portrait}
                      alt={hero.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--abyss)] via-transparent to-transparent opacity-80" />
                    {isLastSelected && (
                      <span className="absolute top-2 right-2 text-[9px] font-['Cinzel',serif] uppercase px-2 py-0.5 border border-[var(--gold)] bg-[var(--gold)] text-black font-bold tracking-wider shadow">
                        Último
                      </span>
                    )}
                  </div>

                  {/* Nome & Epíteto */}
                  <div className="mb-2">
                    <h2 className="font-['Cinzel',serif] text-lg font-bold text-[var(--gold-hi)] group-hover:brightness-110 transition-colors">
                      {hero.name}
                    </h2>
                    <p className="font-['EB_Garamond',serif] italic text-xs text-[var(--gold)] tracking-wide">
                      {hero.epithet}
                    </p>
                  </div>

                  {/* Badges de Caminho & Raça */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[10px] font-['Cinzel',serif] uppercase px-2 py-0.5 border border-[var(--gold-lo)] bg-black/40 text-[var(--gold-hi)]">
                      {hero.caminho}
                    </span>
                    <span className="text-[10px] font-['Cinzel',serif] uppercase px-2 py-0.5 border border-[var(--iron)] bg-black/40 text-[var(--muted)]">
                      {hero.race}
                    </span>
                  </div>

                  {/* Juramento */}
                  <div className="p-2.5 border-l-2 border-[var(--gold-lo)] bg-black/40 text-[11px] font-['EB_Garamond',serif] italic text-[var(--text)] leading-snug mb-4">
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
                  className="w-full py-2.5 px-3 font-['Cinzel',serif] font-bold text-xs uppercase tracking-wider text-[var(--abyss)] end-turn flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Sword className="w-3.5 h-3.5 text-[var(--abyss)]" />
                  <span>{hero.btnLabel}</span>
                </button>
              </StonePanel>
            );
          })}

          {/* CARD 4: O MESTRE */}
          <StonePanel
            onClick={handleEnterDM}
            className={`group flex flex-col justify-between p-4 cursor-pointer transition-all duration-200 border select-none ${
              role === 'mestre'
                ? 'border-[var(--gold)] shadow-[0_0_20px_rgba(201,164,92,0.35)]'
                : 'border-[var(--iron)] hover:border-[var(--gold-lo)] hover:-translate-y-1'
            }`}
          >
            <div>
              {/* Header Mestre */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 border border-[var(--gold-lo)] bg-black/40 flex items-center justify-center text-[var(--gold)] shrink-0 group-hover:scale-105 transition-transform">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-['Cinzel',serif] text-lg font-bold text-[var(--gold-hi)]">
                    O Mestre
                  </h2>
                  <p className="font-['EB_Garamond',serif] italic text-xs text-[var(--gold)]">
                    Confessor da Mesa
                  </p>
                </div>
              </div>

              {/* Badges Mestre */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[10px] font-['Cinzel',serif] uppercase px-2 py-0.5 border border-[var(--gold-lo)] bg-black/40 text-[var(--gold-hi)] font-bold">
                  Narrador & Juiz
                </span>
                <span className="text-[10px] font-['Cinzel',serif] uppercase px-2 py-0.5 border border-[var(--iron)] bg-black/40 text-[var(--muted)]">
                  Acesso Imediato
                </span>
              </div>

              {/* Descrição */}
              <p className="text-xs text-[var(--text)] font-['EB_Garamond',serif] leading-relaxed mb-4 italic">
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
              className="w-full py-2.5 px-3 font-['Cinzel',serif] font-bold text-xs uppercase tracking-wider text-[var(--abyss)] end-turn flex items-center justify-center gap-1.5 shadow-md"
            >
              <Crown className="w-3.5 h-3.5 text-[var(--abyss)]" />
              <span>Entrar como Mestre</span>
            </button>
          </StonePanel>
        </div>

        {/* Barra Inferior com Atalhos da TV e Transmissão */}
        <footer className="mt-12 pt-6 border-t border-[var(--iron)]/70 w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-[var(--gold)]" />
            <span className="text-[var(--text)] font-['Cinzel',serif] uppercase tracking-wider text-[11px] font-bold">
              Transmissão para Telão & TV:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/batalha"
              className="px-3 py-1.5 slab border border-[var(--iron)] hover:border-[var(--gold-lo)] text-[var(--text)] hover:text-[var(--gold-hi)] transition font-['Cinzel',serif] text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>/batalha (Mapa TV)</span>
            </Link>
            <Link
              to="/mesa"
              className="px-3 py-1.5 slab border border-[var(--iron)] hover:border-[var(--gold-lo)] text-[var(--text)] hover:text-[var(--gold-hi)] transition font-['Cinzel',serif] text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>/mesa (Dados TV)</span>
            </Link>
            <Link
              to="/tv"
              className="px-3 py-1.5 slab border border-[var(--iron)] hover:border-[var(--gold-lo)] text-[var(--muted)] hover:text-white transition font-['Cinzel',serif] text-xs uppercase tracking-wider"
            >
              Central TV
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
