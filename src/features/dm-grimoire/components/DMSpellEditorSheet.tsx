import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Code, Sliders, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { GrimorioSpell } from '../../grimoire/api';
import { useSalvarMagiaMutation } from '../api/useDMGrimoire';
import { Button, Modal } from '../../../shared/ui';

interface DMSpellEditorSheetProps {
  magia: GrimorioSpell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DMSpellEditorSheet: React.FC<DMSpellEditorSheetProps> = ({
  magia,
  open,
  onOpenChange,
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    circulo: 0,
    escola: 'Geral',
    fonte: 'Arcana',
    custo_foco: 0,
    custo_inspiracao: 1,
    resumo: '',
    descricao: '',
    revisar_mestre: false,
    em_combate: true,
  });

  const [rawJson, setRawJson] = useState('');
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonError, setJsonError] = useState('');

  const saveMutation = useSalvarMagiaMutation();

  useEffect(() => {
    if (magia) {
      setFormData({
        nome: magia.nome || '',
        circulo: Number(magia.circulo ?? 0),
        escola: magia.escola || 'Geral',
        fonte: magia.fonte || 'Arcana',
        custo_foco: Number(magia.custo_foco ?? 0),
        custo_inspiracao: Number(magia.custo_inspiracao ?? 1),
        resumo: magia.resumo || '',
        descricao: magia.descricao || '',
        revisar_mestre: Boolean(magia.revisar_mestre),
        em_combate: magia.em_combate ?? true,
      });

      try {
        setRawJson(JSON.stringify(magia.efeitos || [], null, 2));
      } catch {
        setRawJson('[]');
      }
      setJsonError('');
    }
  }, [magia]);

  if (!magia) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('O nome da magia é obrigatório.');
      return;
    }

    let parsedEfeitos = magia.efeitos || [];
    if (jsonMode) {
      try {
        parsedEfeitos = JSON.parse(rawJson);
      } catch (err: any) {
        setJsonError(`JSON de efeitos inválido: ${err.message}`);
        return;
      }
    }

    try {
      await saveMutation.mutateAsync({
        magiaId: magia.id,
        updates: {
          nome: formData.nome.trim(),
          circulo: Number(formData.circulo),
          escola: formData.escola.trim(),
          fonte: formData.fonte.trim(),
          resumo: formData.resumo.trim(),
          descricao: formData.descricao.trim(),
          revisar_mestre: formData.revisar_mestre,
          em_combate: formData.em_combate,
          efeitos: parsedEfeitos,
        },
      });
      onOpenChange(false);
    } catch {
      // toast already handled by mutation
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Editar Magia: ${magia.nome}`}
      description="Modifique as propriedades mágicas, custo e regras de resolução desta magia no motor."
      className="max-w-2xl bg-[#14100c] border border-[var(--gold)]/30 text-[#ebe6d6]"
    >
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        {/* Toggle Mode */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setJsonMode(!jsonMode)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-serif border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
          >
            {jsonMode ? <Sliders size={13} /> : <Code size={13} />}
            {jsonMode ? 'Modo Formulário' : 'Editor JSON de Efeitos'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-xs font-serif font-semibold text-[var(--gold)]">
              Nome da Magia
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-[#f5f0e1] focus:border-[var(--gold)] focus:outline-none"
              placeholder="Ex: Lança de Gelo"
              required
            />
          </div>

          {/* Escola / Fonte */}
          <div className="space-y-1">
            <label className="text-xs font-serif font-semibold text-[var(--gold)]">
              Fonte / Tradição
            </label>
            <select
              value={formData.fonte}
              onChange={(e) => setFormData({ ...formData, fonte: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-[#f5f0e1] focus:border-[var(--gold)] focus:outline-none"
            >
              <option value="Arcana">Arcana</option>
              <option value="Fogo">Fogo</option>
              <option value="Som">Som</option>
              <option value="Peste">Peste</option>
              <option value="Sangue">Sangue</option>
              <option value="Sombra">Sombra</option>
              <option value="Luz">Luz</option>
            </select>
          </div>

          {/* Círculo */}
          <div className="space-y-1">
            <label className="text-xs font-serif font-semibold text-[var(--gold)]">
              Círculo de Poder (0 a 5)
            </label>
            <input
              type="number"
              min={0}
              max={5}
              value={formData.circulo}
              onChange={(e) => setFormData({ ...formData, circulo: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-[#f5f0e1] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>

          {/* Custo de Foco */}
          <div className="space-y-1">
            <label className="text-xs font-serif font-semibold text-[var(--gold)]">
              Custo de Foco
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={formData.custo_foco}
              onChange={(e) => setFormData({ ...formData, custo_foco: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-[#f5f0e1] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="space-y-1">
          <label className="text-xs font-serif font-semibold text-[var(--gold)]">
            Resumo Rápido
          </label>
          <textarea
            rows={2}
            value={formData.resumo}
            onChange={(e) => setFormData({ ...formData, resumo: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-[#f5f0e1] focus:border-[var(--gold)] focus:outline-none resize-none"
            placeholder="Breve efeito em 1 ou 2 linhas..."
          />
        </div>

        {/* JSON Mode or Description */}
        {jsonMode ? (
          <div className="space-y-1">
            <label className="text-xs font-serif font-semibold text-[var(--gold)]">
              Blocos de Efeitos (JSON)
            </label>
            <textarea
              rows={6}
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setJsonError('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-black/80 font-mono text-xs border border-white/20 text-[#7dd3fc] focus:border-[var(--gold)] focus:outline-none resize-y"
            />
            {jsonError && (
              <p className="text-xs text-rose-400 mt-1">{jsonError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-serif font-semibold text-[var(--gold)]">
              Texto Completo de Regra / Descrição
            </label>
            <textarea
              rows={3}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-[#f5f0e1] focus:border-[var(--gold)] focus:outline-none resize-none"
              placeholder="Explicação aprofundada de funcionamento..."
            />
          </div>
        )}

        {/* Flags */}
        <div className="flex flex-wrap gap-4 pt-1 border-t border-white/10">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/90">
            <input
              type="checkbox"
              checked={formData.revisar_mestre}
              onChange={(e) => setFormData({ ...formData, revisar_mestre: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 text-[var(--gold)] focus:ring-0"
            />
            <span className="flex items-center gap-1 font-serif">
              <AlertTriangle size={13} className="text-amber-400" />
              Requer Deliberação / Flag "revisar_mestre"
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/90">
            <input
              type="checkbox"
              checked={formData.em_combate}
              onChange={(e) => setFormData({ ...formData, em_combate: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 text-[var(--gold)] focus:ring-0"
            />
            <span className="font-serif">Conjurável em Combate</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saveMutation.isPending}
            className="bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-serif font-bold text-xs"
          >
            <Save size={14} className="mr-1.5" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Magia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
