import {
  TABELA_SURTO_MAGICO,
  avaliarPipelineCondicoes,
  resolverMagiaMotor,
  rolar2d6,
  rolarExpressao,
  rolarSurtoMagico,
  verificarRiscoPeste,
} from '../../services/spellEngine';

export interface SpellDefinition {
  id: string;
  nome: string;
  circulo: number;
  afinidade?: string;
  custo_foco: number;
  peso: number;
  tipo?: string;
  dano_base?: string;
  descricao?: string;
  [key: string]: unknown;
}

export {
  TABELA_SURTO_MAGICO,
  rolarSurtoMagico,
  verificarRiscoPeste,
  avaliarPipelineCondicoes,
  rolarExpressao,
  rolar2d6,
  resolverMagiaMotor,
};
