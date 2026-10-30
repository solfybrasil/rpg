// =====================================================================
// CALENDÁRIO DO MUNDO — PESTE DO JURAMENTO
// Ano de 12 meses × 30 dias = 360 dias. Dia de 24 horas (1440 minutos).
// =====================================================================

export const MINUTOS_POR_HORA = 60;
export const HORAS_POR_DIA = 24;
export const MINUTOS_POR_DIA = 1440;
export const DIAS_POR_MES = 30;
export const MESES_POR_ANO = 12;
export const DIAS_POR_ANO = 360;
export const MINUTOS_POR_ANO = 518400; // 360 * 1440

// Valor inicial canônico: Ano 847, mês 5 (Brasa Alta), dia 1, 08:00
export const DATA_INICIAL_MINUTOS = BigInt(439258080);

export interface MesInfo {
  numero: number;
  nome: string;
  estacao: string;
}

export const MESES: Record<number, MesInfo> = {
  1: { numero: 1, nome: 'Primeira Chama', estacao: 'Degelo' },
  2: { numero: 2, nome: 'Degelo', estacao: 'Degelo' },
  3: { numero: 3, nome: 'Brotar', estacao: 'Degelo' },
  4: { numero: 4, nome: 'Sol de Ferro', estacao: 'Brasa Alta' },
  5: { numero: 5, nome: 'Brasa Alta', estacao: 'Brasa Alta' },
  6: { numero: 6, nome: 'Colheita Rubra', estacao: 'Brasa Alta' },
  7: { numero: 7, nome: 'Folha Morta', estacao: 'Cinzas' },
  8: { numero: 8, nome: 'Cinzas', estacao: 'Cinzas' },
  9: { numero: 9, nome: 'Névoa Longa', estacao: 'Cinzas' },
  10: { numero: 10, nome: 'Geada', estacao: 'Longa Noite' },
  11: { numero: 11, nome: 'Longa Noite', estacao: 'Longa Noite' },
  12: { numero: 12, nome: 'Último Fogo', estacao: 'Longa Noite' },
};

export const DIAS_SEMANA = ['Bigorna', 'Rio', 'Lua', 'Corvo', 'Fogo', 'Dragão'];

export type FaseDoDia =
  | 'Madrugada'
  | 'Alvorada'
  | 'Manhã'
  | 'Meio-dia'
  | 'Tarde'
  | 'Crepúsculo'
  | 'Noite';

export interface DataMundo {
  ano: number;
  mes: number;
  nomeMes: string;
  estacao: string;
  dia: number;
  diaSemana: string;
  diaTotal: number;
  hora: number;
  minuto: number;
  faseDia: FaseDoDia;
  faseLua: string;
  clima: string;
  isNoite: boolean;
  isClimaExtremo: boolean;
}

/**
 * Converte minutos acumulados desde o Ano 0 em componentes do calendário.
 */
export function minutosParaData(minutosRaw: bigint | number, clima = 'Céu limpo'): DataMundo {
  const minutos =
    typeof minutosRaw === 'bigint' ? minutosRaw : BigInt(Math.max(0, Math.floor(minutosRaw)));

  const minutosNum = Number(minutos);
  const totalDias = Math.floor(minutosNum / MINUTOS_POR_DIA);
  const minutosNoDia = minutosNum % MINUTOS_POR_DIA;

  const hora = Math.floor(minutosNoDia / MINUTOS_POR_HORA);
  const minuto = minutosNoDia % MINUTOS_POR_HORA;

  const ano = Math.floor(totalDias / DIAS_POR_ANO);
  const diaNoAno = totalDias % DIAS_POR_ANO; // 0..359

  const mesNum = Math.floor(diaNoAno / DIAS_POR_MES) + 1; // 1..12
  const dia = (diaNoAno % DIAS_POR_MES) + 1; // 1..30

  const mesInfo = MESES[mesNum] || { numero: mesNum, nome: 'Desconhecido', estacao: 'Degelo' };
  const diaSemana = DIAS_SEMANA[totalDias % 6];

  const faseDia = obterFaseDoDia(hora);
  const faseLua = obterFaseLua(dia);
  const isNoite = hora >= 20 || hora <= 4;
  const isExtremo = isClimaExtremo(clima);

  return {
    ano,
    mes: mesNum,
    nomeMes: mesInfo.nome,
    estacao: mesInfo.estacao,
    dia,
    diaSemana,
    diaTotal: totalDias,
    hora,
    minuto,
    faseDia,
    faseLua,
    clima: clima || 'Céu limpo',
    isNoite,
    isClimaExtremo: isExtremo,
  };
}

/**
 * Converte ano, mês, dia, hora e minuto em minutos absolutos desde o Ano 0.
 */
export function dataParaMinutos(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
): bigint {
  const diasCompletos = ano * DIAS_POR_ANO + (mes - 1) * DIAS_POR_MES + (dia - 1);
  return BigInt(diasCompletos) * BigInt(MINUTOS_POR_DIA) + BigInt(hora * 60 + minuto);
}

/**
 * Determina a fase do dia a partir da hora (0-23).
 */
export function obterFaseDoDia(hora: number): FaseDoDia {
  if (hora >= 0 && hora <= 4) return 'Madrugada';
  if (hora >= 5 && hora <= 6) return 'Alvorada';
  if (hora >= 7 && hora <= 11) return 'Manhã';
  if (hora >= 12 && hora <= 13) return 'Meio-dia';
  if (hora >= 14 && hora <= 17) return 'Tarde';
  if (hora >= 18 && hora <= 19) return 'Crepúsculo';
  return 'Noite'; // 20-23
}

/**
 * Calcula a fase da lua no ciclo de 30 dias.
 */
export function obterFaseLua(diaDoMes: number): string {
  if (diaDoMes >= 1 && diaDoMes <= 3) return 'Lua nova';
  if (diaDoMes >= 4 && diaDoMes <= 11) return 'Lua crescente';
  if (diaDoMes >= 12 && diaDoMes <= 18) return 'Lua cheia';
  if (diaDoMes >= 19 && diaDoMes <= 26) return 'Lua minguante';
  return 'Lua nova'; // 27-30
}

/**
 * Retorna se o clima é considerado extremo (causa x1.5 fome).
 */
export function isClimaExtremo(clima: string): boolean {
  if (!clima) return false;
  const c = clima.trim().toLowerCase();
  return c === 'nevasca' || c === 'calor forte';
}

/**
 * Sorteia o clima com 1d6 conforme a estação do mês (1..12).
 */
export function sortearClimaParaMes(mes: number, d6Random?: number): string {
  const estacao = MESES[mes]?.estacao || 'Degelo';
  const d6 = d6Random ?? Math.floor(Math.random() * 6) + 1;

  switch (estacao) {
    case 'Degelo':
      if (d6 <= 2) return 'Chuva fina';
      if (d6 <= 4) return 'Nublado';
      if (d6 === 5) return 'Neblina';
      return 'Céu limpo';

    case 'Brasa Alta':
      if (d6 <= 3) return 'Céu limpo';
      if (d6 === 4) return 'Calor forte';
      if (d6 === 5) return 'Tempestade';
      return 'Neblina';

    case 'Cinzas':
      if (d6 <= 2) return 'Nublado';
      if (d6 <= 4) return 'Neblina';
      if (d6 === 5) return 'Chuva';
      return 'Vento forte';

    default:
      if (d6 <= 2) return 'Neve';
      if (d6 === 3) return 'Nevasca';
      if (d6 <= 5) return 'Nublado';
      return 'Céu limpo e gelado';
  }
}

/**
 * Formata a data completa do mundo exatamente no padrão solicitado:
 * "Dia 14 de Brasa Alta, Ano 847 · Crepúsculo · Neblina · Lua cheia"
 */
export function formatarDataMundo(data: DataMundo): string {
  return `Dia ${data.dia} de ${data.nomeMes}, Ano ${data.ano} · ${data.faseDia} · ${data.clima} · ${data.faseLua}`;
}

/**
 * Formata contagem regressiva de prazos em tempo do mundo:
 * Ex: "2 dias e 5 horas", "1 dia", "3 horas", "45 minutos" ou "Venceu"
 */
export function formatarTempoRestante(
  venceEmMinutos: bigint | number,
  minutosAtuais: bigint | number,
): string {
  const diff = Number(BigInt(venceEmMinutos) - BigInt(minutosAtuais));
  if (diff <= 0) return 'Venceu';

  const dias = Math.floor(diff / MINUTOS_POR_DIA);
  const horas = Math.floor((diff % MINUTOS_POR_DIA) / MINUTOS_POR_HORA);
  const minutos = diff % MINUTOS_POR_HORA;

  if (dias > 0) {
    if (horas > 0) {
      return `${dias} dia${dias > 1 ? 's' : ''} e ${horas} hora${horas > 1 ? 's' : ''}`;
    }
    return `${dias} dia${dias > 1 ? 's' : ''}`;
  }

  if (horas > 0) {
    if (minutos > 0) {
      return `${horas} hora${horas > 1 ? 's' : ''} e ${minutos} min`;
    }
    return `${horas} hora${horas > 1 ? 's' : ''}`;
  }

  return `${minutos} minuto${minutos > 1 ? 's' : ''}`;
}

/**
 * Retorna as cores temáticas e classes de fundo conforme a fase do dia.
 */
export function obterEstiloFaseDia(fase: FaseDoDia): {
  bg: string;
  border: string;
  textColor: string;
  glow: string;
  iconName: string;
} {
  switch (fase) {
    case 'Alvorada':
      return {
        bg: 'linear-gradient(90deg, #2b1810 0%, #4a2818 50%, #2b1810 100%)',
        border: '#c27838',
        textColor: '#fcd34d',
        glow: 'rgba(245, 158, 11, 0.25)',
        iconName: 'Sunrise',
      };
    case 'Manhã':
    case 'Meio-dia':
      return {
        bg: 'linear-gradient(90deg, #241c14 0%, #3a2e1d 50%, #241c14 100%)',
        border: '#cca142',
        textColor: '#fef08a',
        glow: 'rgba(236, 192, 92, 0.2)',
        iconName: 'Sun',
      };
    case 'Tarde':
      return {
        bg: 'linear-gradient(90deg, #241910 0%, #3d2516 50%, #241910 100%)',
        border: '#b86d2f',
        textColor: '#fdba74',
        glow: 'rgba(217, 119, 6, 0.2)',
        iconName: 'SunMedium',
      };
    case 'Crepúsculo':
      return {
        bg: 'linear-gradient(90deg, #261118 0%, #4a1d28 50%, #261118 100%)',
        border: '#e11d48',
        textColor: '#fda4af',
        glow: 'rgba(225, 29, 72, 0.3)',
        iconName: 'Sunset',
      };
    case 'Madrugada':
      return {
        bg: 'linear-gradient(90deg, #070913 0%, #0d1224 50%, #070913 100%)',
        border: '#1e3a5f',
        textColor: '#93c5fd',
        glow: 'rgba(59, 130, 246, 0.25)',
        iconName: 'Moon',
      };
    default:
      return {
        bg: 'linear-gradient(90deg, #090d1a 0%, #111a30 50%, #090d1a 100%)',
        border: '#2563eb',
        textColor: '#bfdbfe',
        glow: 'rgba(37, 99, 235, 0.3)',
        iconName: 'MoonStar',
      };
  }
}

/**
 * Calcula quantos minutos faltam para a próxima fase do dia e o nome da próxima fase.
 */
export function calcularTransicaoProximaFase(minutosAtuais: bigint | number): {
  minutosFaltando: number;
  proximaFase: FaseDoDia;
} {
  const data = minutosParaData(minutosAtuais);
  const hora = data.hora;
  const minuto = data.minuto;

  let targetHora = 5;
  let proximaFase: FaseDoDia = 'Alvorada';

  if (hora >= 0 && hora <= 4) {
    targetHora = 5;
    proximaFase = 'Alvorada';
  } else if (hora >= 5 && hora <= 6) {
    targetHora = 7;
    proximaFase = 'Manhã';
  } else if (hora >= 7 && hora <= 11) {
    targetHora = 12;
    proximaFase = 'Meio-dia';
  } else if (hora >= 12 && hora <= 13) {
    targetHora = 14;
    proximaFase = 'Tarde';
  } else if (hora >= 14 && hora <= 17) {
    targetHora = 18;
    proximaFase = 'Crepúsculo';
  } else if (hora >= 18 && hora <= 19) {
    targetHora = 20;
    proximaFase = 'Noite';
  } else {
    // 20-23 -> avança até 00:00 (Madrugada do dia seguinte)
    targetHora = 24;
    proximaFase = 'Madrugada';
  }

  const minutosPassadosNoDia = hora * 60 + minuto;
  const minutosAlvoNoDia = targetHora * 60;
  const minutosFaltando = Math.max(1, minutosAlvoNoDia - minutosPassadosNoDia);

  return { minutosFaltando, proximaFase };
}
