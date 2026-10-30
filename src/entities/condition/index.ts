import {
  CONDICOES_CATALOGO,
  aplicarCondicao,
  avaliarCombosElementais,
  calcularModificadoresCondicoes,
  gerarEfeitosAutomaticosBestiario,
  inferirEfeitosPocao,
  normalizarCondicao,
  processarTiqueInicioTurno,
  removerCondicao,
  rolarFormulaTique,
  testarEfeitosAtaqueFera,
} from '../../services/conditionEngine';

export interface ActiveCondition {
  id: string;
  nome?: string;
  pilhas?: number;
  duracao?: number;
  origem?: string;
  [key: string]: unknown;
}

export {
  CONDICOES_CATALOGO,
  normalizarCondicao,
  aplicarCondicao,
  removerCondicao,
  avaliarCombosElementais,
  processarTiqueInicioTurno,
  calcularModificadoresCondicoes,
  gerarEfeitosAutomaticosBestiario,
  testarEfeitosAtaqueFera,
  inferirEfeitosPocao,
  rolarFormulaTique,
};
