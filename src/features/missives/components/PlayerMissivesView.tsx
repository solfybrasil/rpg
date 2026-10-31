import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, Send, Sparkles, Check, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useHero } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { Parchment, WaxSeal, GoldButton } from '../../../shared/ui';
import {
  fetchSessionMessages,
  sendMessageToDB,
  subscribeToMessagesRealtime,
} from '../api';
import type { Missive } from '../types';
import { MissiveAlertModal } from './MissiveAlertModal';

export const PlayerMissivesView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';
  const { hero } = useHero(heroId);

  const [messages, setMessages] = useState<Missive[]>([]);
  const [selectedMissiveId, setSelectedMissiveId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [alertMissive, setAlertMissive] = useState<Missive | null>(null);

  // Armazenamento local de IDs lidos
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`peste_read_missives_${heroId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const saveReadId = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(`peste_read_missives_${heroId}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Carrega histórico
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const msgs = await fetchSessionMessages('MESA');
      if (isMounted) {
        setMessages(msgs);
        if (msgs.length > 0) {
          // Seleciona a mais recente por padrão
          setSelectedMissiveId(msgs[msgs.length - 1].id);
        }
      }
    })();

    // Sincronização em tempo real
    const unsub = subscribeToMessagesRealtime('MESA', (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Se a mensagem for direcionada a este jogador e não for enviada por ele, dispara o alerta
      const isForMe =
        newMsg.to_id === heroId || newMsg.to_id === 'broadcast' || !newMsg.to_id;
      const isFromMe = newMsg.from_id === heroId;
      if (isForMe && !isFromMe) {
        setAlertMissive(newMsg);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [heroId]);

  // Filtra as mensagens relevantes ao jogador
  const playerMessages = useMemo(() => {
    return messages.filter(
      (m) =>
        m.to_id === heroId ||
        m.from_id === heroId ||
        m.to_id === 'broadcast' ||
        m.to_id === 'dm' ||
        !m.to_id,
    );
  }, [messages, heroId]);

  const selectedMissive = useMemo(() => {
    return playerMessages.find((m) => m.id === selectedMissiveId) || null;
  }, [playerMessages, selectedMissiveId]);

  const handleSelect = (msg: Missive) => {
    setSelectedMissiveId(msg.id);
    saveReadId(msg.id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      const charName = hero?.name || 'Jurado';
      const sent = await sendMessageToDB({
        sessionCode: 'MESA',
        fromId: heroId,
        toId: 'dm',
        fromName: charName,
        text: inputText.trim(),
        priority: 'SAGRADA',
      });

      setMessages((prev) => [...prev, sent]);
      setSelectedMissiveId(sent.id);
      saveReadId(sent.id);
      setInputText('');
      toast.success('Palavra enviada ao Confessor da Mesa.');
    } catch (err) {
      console.error('[MISSIVES] Falha ao enviar:', err);
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Alerta de Chegada da Missiva */}
      {alertMissive && (
        <MissiveAlertModal
          missive={alertMissive}
          onDismiss={() => {
            saveReadId(alertMissive.id);
            setSelectedMissiveId(alertMissive.id);
            setAlertMissive(null);
          }}
        />
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-[var(--iron)]/60 pb-4">
        <div>
          <h1 className="font-['Cinzel',serif] text-xl md:text-2xl font-bold text-[var(--gold-hi)] tracking-wide flex items-center gap-2">
            <Mail className="w-5 h-5 text-[var(--gold)]" /> Missivas do Confessor
          </h1>
          <p className="font-serif text-xs md:text-sm text-[var(--muted)] italic">
            Correspondências lacradas e proclamações sagradas entre o herói e a mesa.
          </p>
        </div>
      </div>

      {/* Layout de Caixa de Entrada e Coluna de Leitura */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 min-h-[500px]">
        {/* Lista Estilo Caixa de Entrada */}
        <div className="flex flex-col slab border border-[var(--iron)] overflow-hidden">
          <div className="p-3 border-b border-[var(--iron)]/60 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--gold-hi)] font-bold flex justify-between items-center">
            <span>Caixa de Entrada</span>
            <span>{playerMessages.length} cartas</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[440px]">
            {playerMessages.length === 0 ? (
              <div className="text-center py-12 px-4 text-[var(--muted)] font-serif italic text-sm">
                Nenhuma missiva recebida ainda. O Confessor da Mesa está em silêncio...
              </div>
            ) : (
              playerMessages.map((m) => {
                const isSelected = m.id === selectedMissiveId;
                const isFromMe = m.from_id === heroId;
                const isUnread = !isFromMe && !readIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    data-testid="missive-item"
                    onClick={() => handleSelect(m)}
                    className={`
                      p-3 cursor-pointer transition-all flex items-start gap-3 relative
                      ${
                        isSelected
                          ? 'slab border border-[var(--gold-hi)] shadow-md'
                          : 'recess border border-black hover:border-[var(--gold-lo)]'
                      }
                    `}
                  >
                    {/* Selo de Cera (--blood) em não lidas */}
                    {isUnread ? (
                      <div
                        data-testid="wax-seal"
                        title="Não lida"
                        className="w-4 h-4 rounded-full bg-[var(--blood)] border border-[var(--gold)] flex items-center justify-center shrink-0 mt-0.5 shadow-sm"
                      >
                        <span className="text-[9px] text-[var(--gold-hi)]">⚜</span>
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/20 shrink-0 mt-2 ml-1" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-['Cinzel',serif] text-xs font-bold uppercase tracking-wider truncate ${
                            isSelected ? 'text-[var(--gold-hi)]' : 'text-[var(--text)]'
                          }`}
                        >
                          {isFromMe
                            ? 'VOCÊ → CONFESSOR'
                            : m.to_id === 'broadcast'
                            ? 'PROCLAMAÇÃO GERAL'
                            : 'CONFESSOR'}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] font-mono shrink-0">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="font-serif text-xs text-[var(--muted)] truncate italic mt-1">
                        {m.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Estreita de Leitura em Pergaminho com Selo de Cera */}
        <div className="flex flex-col slab border border-[var(--iron)] p-4 md:p-6 justify-between relative overflow-hidden">
          {selectedMissive ? (
            <div className="space-y-4 max-w-lg mx-auto w-full">
              <Parchment className="p-6 md:p-8 flex flex-col items-center">
                {/* Selo e Cabeçalho da Carta */}
                <div className="text-center border-b border-[var(--ink)]/20 pb-4 w-full flex flex-col items-center">
                  <div className="mb-2">
                    <WaxSeal text="CONFESSOR" tone="blood" size="md" />
                  </div>
                  <h3 className="font-['Cinzel',serif] text-lg font-bold text-[var(--ink)] tracking-wider uppercase mt-2">
                    {selectedMissive.from_id === heroId
                      ? 'Palavra Registrada'
                      : 'Palavra do Confessor'}
                  </h3>
                  <div className="text-xs font-serif text-[var(--ink)]/60 italic mt-0.5">
                    {selectedMissive.priority || 'SAGRADA'} ·{' '}
                    {new Date(selectedMissive.created_at).toLocaleDateString()} às{' '}
                    {new Date(selectedMissive.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Corpo da Carta em Garamond */}
                <div className="py-6 px-2 md:px-4 w-full">
                  <p className="font-serif italic text-base md:text-lg leading-relaxed text-[var(--ink)] tracking-wide text-center">
                    "{selectedMissive.text}"
                  </p>
                </div>

                {/* Informação de Remetente / Destinatário */}
                <div className="text-center pt-3 border-t border-[var(--ink)]/20 w-full text-xs font-serif text-[var(--ink)]/60 italic">
                  {selectedMissive.from_id === heroId
                    ? `Registrado por ${hero?.name || 'Jurado'}`
                    : 'Selo oficial do Confessor da Mesa'}
                </div>
              </Parchment>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-[var(--muted)] font-serif p-12">
              <Mail className="w-12 h-12 opacity-30 mb-3" />
              <p className="italic">Selecione uma missiva na lista para romper o lacre e ler.</p>
            </div>
          )}

          {/* Campo de Envio para o Confessor */}
          <form
            onSubmit={handleSend}
            className="flex gap-2 pt-4 border-t border-[var(--iron)]/60 mt-4"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Envie uma palavra ao Confessor..."
              className="flex-1 recess border border-black px-4 py-2 text-sm font-serif text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold-lo)] transition-colors"
            />
            <GoldButton
              type="submit"
              disabled={!inputText.trim() || isSending}
              size="md"
            >
              <Send className="w-3.5 h-3.5 inline mr-1" /> Enviar
            </GoldButton>
          </form>
        </div>
      </div>
    </div>
  );
};
