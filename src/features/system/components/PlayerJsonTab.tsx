import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Upload,
  FileCode,
  Users,
  User,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  useCompiledPlayersJson,
  useImportPlayerJsonMutation,
  CompiledPlayerJson,
} from '../api/useDMSystem';
import { Modal } from '../../../shared/ui/Modal';
import { toast } from 'sonner';

export const PlayerJsonTab: React.FC = () => {
  const { data: players = [], isLoading, refetch, isFetching } = useCompiledPlayersJson();
  const [selectedHeroId, setSelectedHeroId] = useState<string>('all');
  const [isMinified, setIsMinified] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const importMutation = useImportPlayerJsonMutation();

  // Active payload to display
  const activePayload = useMemo(() => {
    if (selectedHeroId === 'all') {
      return players;
    }
    const single = players.find((p) => p.id === selectedHeroId);
    return single || null;
  }, [players, selectedHeroId]);

  const jsonString = useMemo(() => {
    if (!activePayload) return '{}';
    return isMinified
      ? JSON.stringify(activePayload)
      : JSON.stringify(activePayload, null, 2);
  }, [activePayload, isMinified]);

  const lineCount = useMemo(() => {
    return jsonString.split('\n').length;
  }, [jsonString]);

  const byteSize = useMemo(() => {
    const bytes = new Blob([jsonString]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [jsonString]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setHasCopied(true);
      toast.success('JSON copiado para a área de transferência!');
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar para a área de transferência.');
    }
  };

  const handleDownload = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename =
      selectedHeroId === 'all'
        ? `peste_todos_jogadores_${dateStr}.json`
        : `peste_jogador_${selectedHeroId}_${dateStr}.json`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Arquivo ${filename} baixado com sucesso!`);
  };

  const handleConfirmImport = async () => {
    if (!importJsonText.trim()) {
      toast.error('Cole o conteúdo da ficha JSON para importar.');
      return;
    }
    try {
      await importMutation.mutateAsync(importJsonText);
      setIsImportModalOpen(false);
      setImportJsonText('');
      void refetch();
    } catch {
      // toast tratado na mutation
    }
  };

  return (
    <div className="space-y-6" data-testid="player-json-tab">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/80 border border-white/10 shadow-md">
        {/* Hero Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            data-testid="json-filter-all"
            onClick={() => setSelectedHeroId('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-serif text-xs font-bold transition-all cursor-pointer shrink-0 border ${
              selectedHeroId === 'all'
                ? 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/60 shadow-sm'
                : 'bg-white/5 text-white/60 hover:text-white border-white/5 hover:bg-white/10'
            }`}
          >
            <Users size={14} />
            Todos os Jurados ({players.length})
          </button>

          {players.map((hero) => (
            <button
              key={hero.id}
              type="button"
              data-testid={`json-filter-${hero.id}`}
              onClick={() => setSelectedHeroId(hero.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-serif text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                selectedHeroId === hero.id
                  ? 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/60 shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white border-white/5 hover:bg-white/10'
              }`}
            >
              <User size={14} />
              {hero.nome}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format Switcher */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              data-testid="json-format-indented"
              onClick={() => setIsMinified(false)}
              className={`px-2.5 py-1 rounded-lg font-serif transition-colors cursor-pointer ${
                !isMinified ? 'bg-white/15 text-white font-bold' : 'text-white/40 hover:text-white'
              }`}
            >
              Indentado
            </button>
            <button
              type="button"
              data-testid="json-format-minified"
              onClick={() => setIsMinified(true)}
              className={`px-2.5 py-1 rounded-lg font-serif transition-colors cursor-pointer ${
                isMinified ? 'bg-white/15 text-white font-bold' : 'text-white/40 hover:text-white'
              }`}
            >
              Minificado
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            data-testid="json-copy-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-serif text-xs transition-all cursor-pointer active:scale-95"
          >
            {hasCopied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
            {hasCopied ? 'Copiado!' : 'Copiar'}
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            data-testid="json-download-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30 font-serif text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <Download size={14} />
            Baixar .json
          </button>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            data-testid="json-import-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-serif text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <Upload size={14} />
            Importar Ficha
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => void refetch()}
            data-testid="json-refresh-btn"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Atualizar dados do Supabase"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-neutral-950 rounded-2xl border border-white/15 overflow-hidden shadow-2xl">
        {/* Terminal Titlebar */}
        <div className="bg-neutral-900/90 px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-xs font-mono text-white/50 ml-2">
              {selectedHeroId === 'all'
                ? '~/peste/todos_jogadores.json'
                : `~/peste/personagens/${selectedHeroId}.json`}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-white/40">
            <span>{byteSize}</span>
            <span>•</span>
            <span>{lineCount} linhas</span>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 sm:p-6 overflow-x-auto max-h-[640px]">
          {isLoading ? (
            <div className="py-20 text-center text-xs font-mono text-white/40">
              Carregando e compilando fichas dos jogadores...
            </div>
          ) : (
            <pre
              data-testid="json-code-viewer"
              className="font-mono text-xs text-amber-100/90 leading-relaxed whitespace-pre"
            >
              <code>{jsonString}</code>
            </pre>
          )}
        </div>
      </div>

      {/* Modal de Importação de Ficha */}
      <Modal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Importar Ficha de Jogador (JSON)"
      >
        <div className="space-y-4 p-4 text-[var(--text-1)]">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
            <FileCode size={18} className="text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs font-serif text-purple-200/90 leading-relaxed">
              Cole o JSON exportado de uma ficha de personagem. Os status vitais, peste, atributos e nome serão sincronizados diretamente no banco de dados.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-serif uppercase tracking-wider text-white/60">
              Payload JSON da Ficha
            </label>
            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='Cole aqui a ficha em JSON (deve conter "id" e "nome")...'
              data-testid="import-player-json-textarea"
              className="w-full p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-[var(--text-1)] placeholder-white/30 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-serif text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importMutation.isPending}
              data-testid="confirm-import-player-btn"
              className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-serif text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              {importMutation.isPending ? 'Sincronizando...' : 'Confirmar Importação'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
