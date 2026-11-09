import type { GridMode } from './IsometricGrid.ts';

/**
 * Configurações da mesa que a tabela `battle_maps` não tem coluna própria.
 * Ficam no fragmento da URL do fundo (`…/fundo.mp4#grade=quadrada`): o
 * fragmento não vai na requisição HTTP, então imagem e vídeo carregam igual,
 * e não é preciso migrar o banco. Tudo passa por aqui, então trocar para uma
 * coluna no futuro é só mudar estas funções.
 */

export interface MapSettings {
  /** URL do arquivo, sem o fragmento. */
  url: string;
  grid: GridMode;
  isVideo: boolean;
}

const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_RE.test(url.split('#')[0]);
}

export function readMapSettings(backgroundUrl: string | null | undefined): MapSettings {
  const raw = backgroundUrl || '/batalha/santuario.jpg';
  const [url, frag = ''] = raw.split('#');
  const params = new URLSearchParams(frag);
  return {
    url,
    grid: params.get('grade') === 'quadrada' ? 'square' : 'iso',
    isVideo: isVideoUrl(url),
  };
}

export function writeMapSettings(url: string, settings: { grid: GridMode }): string {
  const clean = url.split('#')[0];
  return settings.grid === 'square' ? `${clean}#grade=quadrada` : clean;
}
