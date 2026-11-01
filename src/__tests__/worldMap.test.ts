import { describe, expect, it } from 'vitest';
import { KNOWN_CITIES, getCityMapData } from '../features/world-map/data/cityData';
import { mapRegions } from '../features/world-map/data/mapRegions';
import { ICONS, iconSVG, pointsToCatmullRom } from '../features/world-map/engine/mapEngine';
import type { MapPlace } from '../features/world-map/types';

describe('World Map Engine & Data (Prompt 13)', () => {
  it('contém exatamente as 11 regiões canônicas de Aldrenor', () => {
    expect(mapRegions).toHaveLength(11);
    const ids = mapRegions.map((r) => r.id);
    expect(ids).toContain('brumas');
    expect(ids).toContain('ermos');
    expect(ids).toContain('estepes');
    expect(ids).toContain('charnecas');
    expect(ids).toContain('silvarenna');
    expect(ids).toContain('aridas');
    expect(ids).toContain('fuligem');
    expect(ids).toContain('bib');
    expect(ids).toContain('valdoria');
    expect(ids).toContain('cinzas');
    expect(ids).toContain('ilhas');

    for (const r of mapRegions) {
      expect(typeof r.name).toBe('string');
      expect(typeof r.x).toBe('number');
      expect(typeof r.y).toBe('number');
      expect(typeof r.terrain).toBe('string');
      expect(typeof r.people).toBe('string');
    }
  });

  it('calcula spline Catmull-Rom para rota da campanha com diferentes comprimentos', () => {
    // 0 pontos
    const p0 = pointsToCatmullRom([]);
    expect(p0).toBeDefined();

    // 1 ponto
    const p1 = pointsToCatmullRom([[100, 200]]);
    expect(p1).toBeDefined();

    // 2 pontos
    const p2 = pointsToCatmullRom([
      [100, 200],
      [300, 400],
    ]);
    expect(p2).toBeDefined();

    // 5 pontos (curva contínua suave)
    const p5 = pointsToCatmullRom([
      [100, 200],
      [200, 250],
      [350, 400],
      [500, 450],
      [600, 700],
    ]);
    expect(p5).toBeDefined();
  });

  it('produz SVG válido para todos os 12 tipos de marcadores geográficos', () => {
    const types = [
      'cap',
      'cid',
      'por',
      'vil',
      'for',
      'rui',
      'mas',
      'tem',
      'cov',
      'mar',
      'tor',
      'gui',
    ];
    for (const t of types) {
      const svg = iconSVG(t);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('viewBox');
      expect(ICONS[t]).toBeDefined();
    }
  });

  it('carrega o mapa detalhado da cidade para Fosso Negro com distritos e POIs', () => {
    const place: MapPlace = {
      id: 'place-fosso-negro',
      session_code: 'MESA',
      name: 'Fosso Negro',
      type: 'cid',
      region_id: 'fuligem',
      x: 1090,
      y: 1045,
      desc_public: 'Cidade das forjas',
      discovered: true,
      visited: true,
    };

    const cityData = getCityMapData(place, 'Vale da Fuligem');
    expect(cityData.name).toBe('Fosso Negro');
    expect(cityData.population).toContain('42.000');
    expect(cityData.ruler).toContain('Barão Roderic');
    expect(cityData.districts.length).toBeGreaterThanOrEqual(4);

    const cidadela = cityData.districts.find((d) => d.id === 'dist-cidadela');
    expect(cidadela).toBeDefined();
    expect(cidadela?.pointsOfInterest.length).toBeGreaterThanOrEqual(1);

    const mercado = cityData.districts.find((d) => d.id === 'dist-mercado');
    expect(mercado).toBeDefined();
    expect(mercado?.pointsOfInterest.some((poi) => poi.kind === 'Taverna')).toBe(true);
    expect(mercado?.pointsOfInterest.some((poi) => poi.kind === 'Ferreiro')).toBe(true);
  });

  it('gera layout de cidade procedural consistente para povoados e cidades sem mapa estático', () => {
    const customVillage: MapPlace = {
      id: 'place-vila-solitaria',
      session_code: 'MESA',
      name: 'Vila da Pedra Fria',
      type: 'vil',
      region_id: 'ermos',
      x: 1060,
      y: 250,
      desc_public: 'Povoado nas montanhas gélidas.',
      discovered: true,
      visited: false,
    };

    const cityData = getCityMapData(customVillage, 'Ermos do Dragão');
    expect(cityData.name).toBe('Vila da Pedra Fria');
    expect(cityData.regionName).toBe('Ermos do Dragão');
    expect(cityData.districts.length).toBeGreaterThanOrEqual(2);
    expect(cityData.districts[0].pointsOfInterest.length).toBeGreaterThanOrEqual(1);
    expect(cityData.localRumor).toBeDefined();
  });

  it('lida com capitais e portos adaptando títulos e defesas', () => {
    const portPlace: MapPlace = {
      id: 'place-porto-vento',
      session_code: 'MESA',
      name: 'Porto dos Ventos',
      type: 'por',
      region_id: 'ilhas',
      x: 2200,
      y: 800,
      discovered: true,
      visited: false,
    };

    const portData = getCityMapData(portPlace, 'Ilhas Partidas');
    expect(portData.typeLabel).toBe('Entreposto Portuário');

    const capPlace: MapPlace = {
      id: 'place-valdoria-cap',
      session_code: 'MESA',
      name: 'Valdória Real',
      type: 'cap',
      region_id: 'valdoria',
      x: 680,
      y: 1230,
      discovered: true,
      visited: true,
    };

    const capData = getCityMapData(capPlace, 'Reino de Valdória');
    expect(capData.typeLabel).toBe('Capital Imperial');
    expect(capData.districts.some((d) => d.type === 'cidadela')).toBe(true);
  });
});
