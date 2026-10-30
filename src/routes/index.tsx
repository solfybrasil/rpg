import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Shield, Tv, User } from 'lucide-react';
import { useSessionStore } from '../shared/stores/session.ts';
import { Card } from '../shared/ui/Card.tsx';

export const Route = createFileRoute('/')({
  component: LandingComponent,
});

function LandingComponent() {
  const navigate = useNavigate();
  const setRole = useSessionStore((s) => s.setRole);
  const setHeroId = useSessionStore((s) => s.setHeroId);

  const heroes = [
    { id: 'tor_bjorn', name: 'Tor-Björn', role: 'Guerreiro do Norte', race: 'Anão' },
    { id: 'malenia', name: 'Malênia', role: 'Espada do Juramento', race: 'Humana' },
    { id: 'kaelis_moonfire', name: 'Kaelis Moonfire', role: 'Arquimago Élfico', race: 'Elfo' },
  ];

  const handleSelectPlayer = (heroId: string) => {
    setRole('jogador');
    setHeroId(heroId);
    void navigate({ to: '/jogador/mochila' });
  };

  const handleSelectDM = () => {
    setRole('mestre');
    void navigate({ to: '/mestre/jogadores' });
  };

  const handleSelectTV = () => {
    setRole('tv');
    void navigate({ to: '/tv' });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-b from-[#08080a] via-[#101014] to-[#08080a]">
      <div className="max-w-2xl w-full flex flex-col items-center gap-8 animate-in fade-in-50 duration-300">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#f5b65b]">
            Peste do Juramento · v2.0
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide">
            ESCOLHA SEU PAPEL NA MESA
          </h1>
          <p className="text-xs text-white/50 max-w-md">
            Selecione se deseja conduzir a sessão como Mestre, jogar com seu herói ou abrir a TV da
            mesa.
          </p>
        </div>

        {/* Escolha de Papel Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <Card
            variant="gold"
            onClick={handleSelectDM}
            className="flex flex-col items-center gap-3 p-6 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#f5b65b]/20 border border-[#f5b65b]/40 flex items-center justify-center text-[#f5b65b]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white">Mestre do Jogo</h3>
              <p className="text-xs text-white/60 mt-0.5">
                Acesso completo ao Confessório e controle da mesa
              </p>
            </div>
          </Card>

          <Card
            variant="interactive"
            onClick={handleSelectTV}
            className="flex flex-col items-center gap-3 p-6 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white">Tela TV / Mesa</h3>
              <p className="text-xs text-white/60 mt-0.5">
                Exibição pública de dados 3D, combate e cronômetro
              </p>
            </div>
          </Card>
        </div>

        {/* Escolha do Herói (Jogador) */}
        <div className="flex flex-col items-center gap-3 w-full">
          <span className="text-xs font-serif uppercase tracking-widest text-white/40">
            — ou entrar como Jogador —
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            {heroes.map((h) => (
              <Card
                key={h.id}
                variant="interactive"
                onClick={() => handleSelectPlayer(h.id)}
                className="flex flex-col items-center gap-2 p-4 text-center hover:border-[#f5b65b]/40"
              >
                <div className="w-10 h-10 rounded-full bg-[#f5b65b]/10 border border-[#f5b65b]/30 flex items-center justify-center text-xs font-serif font-bold text-[#f5b65b]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-semibold text-white">{h.name}</h4>
                  <p className="text-[11px] text-white/50">{h.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
