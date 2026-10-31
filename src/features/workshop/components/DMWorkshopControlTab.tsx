import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  FlaskConical,
  Hammer,
  RotateCcw,
  Sparkles,
  Utensils,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { useGameState } from '../../../shared/hooks/baseHooks';
import { Badge, Switch } from '../../../shared/ui/index.ts';
import {
  useRecentCraftAttemptsFeed,
  useToggleAlchemyMutation,
  useToggleForgeMutation,
} from '../api/useDMWorkshop.ts';

export const DMWorkshopControlTab: React.FC = () => {
  const { gameState } = useGameState();
  const toggleForgeMutation = useToggleForgeMutation();
  const toggleAlchemyMutation = useToggleAlchemyMutation();
  const { data: attempts = [], isLoading: isLoadingAttempts } = useRecentCraftAttemptsFeed('MESA');

  const forgeAvailable = Boolean(gameState?.forge_available);
  const alchemyAvailable = gameState?.descanso_evento !== 'alchemy_closed';

  const handleToggleForge = (checked: boolean) => {
    toggleForgeMutation.mutate(
      { forgeAvailable: checked },
      {
        onSuccess: () => {
          toast.success(
            checked
              ? 'Forja acesa! Os aventureiros agora podem forjar armas e armaduras.'
              : 'Forja apagada! O acesso à bigorna foi bloqueado.',
          );
        },
        onError: (err: any) => {
          toast.error(`Falha ao alterar estado da forja: ${err.message}`);
        },
      },
    );
  };

  const handleToggleAlchemy = (checked: boolean) => {
    toggleAlchemyMutation.mutate(
      { alchemyAvailable: checked },
      {
        onSuccess: () => {
          toast.success(
            checked
              ? 'Alquimia aberta! O laboratório e o caldeirão foram liberados.'
              : 'Alquimia trancada! Os jogadores não podem destilar poções.',
          );
        },
        onError: (err: any) => {
          toast.error(`Falha ao alterar estado da alquimia: ${err.message}`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 2 Big Station Control Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Forja Switch Card */}
        <div
          data-testid="forge-control-card"
          className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
            forgeAvailable
              ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/30 to-[#121215] shadow-[0_0_25px_rgba(245,182,91,0.15)]'
              : 'border-white/10 bg-[#121215]/80'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl ${
                  forgeAvailable
                    ? 'border-amber-500/60 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,182,91,0.3)] animate-pulse'
                    : 'border-white/10 bg-black/40 text-white/40'
                }`}
              >
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#ebe6d6]">
                  Forja de Aldrenor
                </h3>
                <p className="text-xs text-white/50 font-serif">
                  Bigorna, braseiro marcial e martelo de ferreiro
                </p>
              </div>
            </div>

            <Badge variant={forgeAvailable ? 'artefato' : 'default'}>
              {forgeAvailable ? 'Acesa' : 'Apagada'}
            </Badge>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-serif text-white/70">
              {forgeAvailable
                ? 'Jurados autorizados a forjar artigos marciais.'
                : 'Forja fria: criação marcial bloqueada.'}
            </span>
            <Switch
              size="lg"
              variant="gold"
              data-testid="toggle-forge-switch"
              checked={forgeAvailable}
              onCheckedChange={handleToggleForge}
              disabled={toggleForgeMutation.isPending}
            />
          </div>
        </div>

        {/* Alquimia Switch Card */}
        <div
          data-testid="alchemy-control-card"
          className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
            alchemyAvailable
              ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 to-[#121215] shadow-[0_0_25px_rgba(16,185,129,0.15)]'
              : 'border-white/10 bg-[#121215]/80'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl ${
                  alchemyAvailable
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'border-white/10 bg-black/40 text-white/40'
                }`}
              >
                <FlaskConical className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#ebe6d6]">
                  Laboratório Alquímico
                </h3>
                <p className="text-xs text-white/50 font-serif">
                  Alambique, caldeirão e destilação de reagentes
                </p>
              </div>
            </div>

            <Badge variant={alchemyAvailable ? 'incomum' : 'default'}>
              {alchemyAvailable ? 'Liberado' : 'Trancado'}
            </Badge>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-serif text-white/70">
              {alchemyAvailable
                ? 'Caldeirão borbulhando: poções e óleos liberados.'
                : 'Laboratório trancado pelo Mestre.'}
            </span>
            <Switch
              size="lg"
              variant="emerald"
              data-testid="toggle-alchemy-switch"
              checked={alchemyAvailable}
              onCheckedChange={handleToggleAlchemy}
              disabled={toggleAlchemyMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Realtime Craft Attempts Feed */}
      <div className="rounded-2xl border border-white/10 bg-[#121215]/90 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#f5b65b]" />
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-[#ebe6d6]">
              Registro de Tentativas em Tempo Real (Mesa)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-white/40">
            {attempts.length} evento(s) recente(s)
          </span>
        </div>

        {isLoadingAttempts ? (
          <div className="py-8 text-center text-xs text-white/40 font-serif italic">
            Consultando registros da forja...
          </div>
        ) : attempts.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40 font-serif">
            Nenhuma tentativa de criação registrada nesta sessão até o momento.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {attempts.map((att: any) => {
              const isSuccess = att.outcome === 'sucesso' || att.outcome === 'brilhante';
              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-white/[0.02] rounded-lg transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                        isSuccess
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-red-500/40 bg-red-500/10 text-red-400'
                      }`}
                    >
                      {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="font-serif font-bold text-[#ebe6d6]">
                        {att.character_id} · {att.station}
                      </p>
                      <p className="text-[11px] text-white/50">{att.result_summary || 'Tentativa de fabricação'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="font-mono text-white/70">
                      Dado: {att.total} vs Peso {att.peso}
                    </span>
                    <Badge variant={isSuccess ? 'incomum' : 'danger'} size="sm">
                      {att.outcome}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
