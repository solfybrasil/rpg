import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, Send, Sparkles, Check, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useHero } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
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
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="font-serif text-xl md:text-2xl font-bold text-[#f5b65b] tracking-wide flex items-center gap-2">
            <Mail className="w-5 h-5" /> Missivas do Confessor
          </h1>
          <p className="font-serif text-xs md:text-sm text-white/50 italic">
            Correspondências lacradas e proclamações sagradas entre o herói e a mesa.
          </p>
        </div>
      </div>

      {/* Layout de Caixa de Entrada e Coluna de Leitura */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 min-h-[500px]">
        {/* Lista Estilo Caixa de Entrada */}
        <div className="flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-white/[0.08] text-xs font-serif uppercase tracking-wider text-[#a8947c] flex justify-between items-center">
            <span>Caixa de Entrada</span>
            <span>{playerMessages.length} cartas</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[440px]">
            {playerMessages.length === 0 ? (
              <div className="text-center py-12 px-4 text-white/40 font-serif italic text-sm">
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
                      p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 relative
                      ${
                        isSelected
                          ? 'bg-[#f5b65b]/15 border border-[#f5b65b]/40'
                          : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05]'
                      }
                    `}
                  >
                    {/* Selo de Cera (--blood) em não lidas */}
                    {isUnread ? (
                      <div
                        data-testid="wax-seal"
                        title="Não lida"
                        className="w-4 h-4 rounded-full bg-[#c8423a] border border-[#f5b65b] flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-[#c8423a]/50"
                      >
                        <span className="text-[9px] text-[#f5e8c8]">⚜</span>
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/20 shrink-0 mt-2 ml-1" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-serif text-xs font-bold uppercase tracking-wider truncate ${
                            isSelected ? 'text-[#f5b65b]' : 'text-white/80'
                          }`}
                        >
                          {isFromMe
                            ? 'VOCÊ → CONFESSOR'
                            : m.to_id === 'broadcast'
                            ? 'PROCLAMAÇÃO GERAL'
                            : 'CONFESSOR'}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono shrink-0">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="font-serif text-xs text-white/60 truncate italic mt-1">
                        {m.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Estreita de Leitura em Newsreader */}
        <div className="flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8 justify-between relative overflow-hidden">
          {selectedMissive ? (
            <div className="space-y-6 max-w-lg mx-auto w-full">
              {/* Selo e Cabeçalho da Carta */}
              <div className="text-center border-b border-white/10 pb-4">
                <div className="inline-flex w-12 h-12 rounded-full bg-gradient-to-br from-[#c8423a] via-[#8f191d] to-[#5e1013] border border-[#f5b65b]/60 items-center justify-center shadow-lg text-lg text-[#f5e8c8] mb-3">
                  ⚜
                </div>
                <h3 className="font-serif text-lg font-bold text-[#f5b65b] tracking-wider uppercase">
                  {selectedMissive.from_id === heroId
                    ? 'Palavra Registrada'
                    : 'Palavra do Confessor'}
                </h3>
                <div className="text-xs font-serif text-white/50 italic mt-0.5">
                  {selectedMissive.priority || 'SAGRADA'} ·{' '}
                  {new Date(selectedMissive.created_at).toLocaleDateString()} às{' '}
                  {new Date(selectedMissive.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Corpo da Carta em Newsreader com Coluna Estreita Elegante */}
              <div className="px-2 md:px-6">
                <p className="font-serif italic text-base md:text-lg leading-relaxed text-[#e8dcce] tracking-wide text-center">
                  "{selectedMissive.text}"
                </p>
              </div>

              {/* Informação de Remetente / Destinatário */}
              <div className="text-center pt-4 border-t border-white/[0.06] text-xs font-serif text-white/40 italic">
                {selectedMissive.from_id === heroId
                  ? `Registrado por ${hero?.name || 'Jurado'}`
                  : 'Selo oficial do Confessor da Mesa'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-white/40 font-serif p-12">
              <Mail className="w-12 h-12 opacity-30 mb-3" />
              <p className="italic">Selecione uma missiva na lista para romper o lacre e ler.</p>
            </div>
          )}

          {/* Campo de Envio para o Confessor */}
          <form
            onSubmit={handleSend}
            className="flex gap-2 pt-6 border-t border-white/[0.08] mt-6"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Envie uma palavra ao Confessor..."
              className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm font-serif text-[#f5f5f7] placeholder:text-white/30 focus:outline-none focus:border-[#f5b65b]/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#ca8a04] to-[#854d0e] text-[#f5e8c8] font-serif text-xs font-bold uppercase tracking-wider border border-[#f5b65b]/50 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md"
            >
              <Send className="w-3.5 h-3.5" /> Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
