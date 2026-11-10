import { ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useGenerateImages, useImageStats } from '../api/aiImages';

const stoneBtn =
  'h-8 px-2.5 inline-flex items-center justify-center gap-1.5 border border-[var(--iron)] text-xs text-[var(--text)] cursor-pointer hover:border-[var(--gold-lo)] active:translate-y-px disabled:opacity-50';

function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="p-3 border border-[var(--iron)] bg-[var(--stone)] flex flex-col gap-2 font-[family-name:var(--body)] text-[var(--text)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-['Cinzel',serif] text-sm tracking-[0.12em] text-[var(--gold-hi)]">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Imagens com IA para o catálogo (Edge Function + Cloudflare Workers AI). */
export function AiImagesPanel() {
  const stats = useImageStats();
  const gen = useGenerateImages();
  const [last, setLast] = useState<string | null>(null);
  const total = stats.data?.total ?? 0;
  const missing = stats.data?.missing ?? 0;
  const done = total - missing;
  const frac = total ? done / total : 0;

  return (
    <Panel title="Imagens com IA" right={<Sparkles className="w-4 h-4 text-[var(--gold)]" />}>
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <b className="tabular-nums">{done}</b> de <span className="tabular-nums">{total}</span> itens com imagem
        </span>
        <span className="text-xs text-[var(--muted)] tabular-nums">{Math.round(frac * 100)}%</span>
      </div>
      <div className="h-1.5 bg-[var(--abyss)] border border-[var(--iron)]">
        <div className="h-full bg-[var(--gold)] origin-left transition-transform duration-[var(--t-base)]" style={{ transform: `scaleX(${frac})` }} />
      </div>
      <button
        type="button"
        className={stoneBtn}
        disabled={gen.isPending || missing === 0}
        onClick={() =>
          gen.mutate(
            { limit: 50 },
            {
              onSuccess: (r) => {
                const msg = `${r.generated.length} geradas${r.failed.length ? `, ${r.failed.length} falharam` : ''}${
                  r.stopped === 'cota' ? '. A cota de hoje da Cloudflare acabou.' : r.stopped === 'tempo' ? '. Continua na próxima.' : '.'
                }`;
                setLast(msg);
                toast.success(`Imagens: ${msg}`);
              },
              onError: (err) => {
                setLast(err instanceof Error ? err.message : 'Erro');
                toast.error(`Imagens: ${err instanceof Error ? err.message : 'erro'}`);
              },
            },
          )
        }
        data-testid="btn-gen-images"
      >
        {gen.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        {gen.isPending ? 'Gerando (até 2 min)…' : missing ? `Gerar as próximas ${Math.min(50, missing)}` : 'Todos têm imagem'}
      </button>
      {last && <p className="text-xs text-[var(--muted)]">{last}</p>}
      <p className="text-[11px] text-[var(--muted)]">
        Também roda sozinho todo dia (agendamento no Supabase) e itens novos do catálogo ganham imagem ao salvar.
      </p>
    </Panel>
  );
}

