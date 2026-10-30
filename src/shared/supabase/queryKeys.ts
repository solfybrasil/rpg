export const queryKeys = {
  heroes: {
    all: ['heroes'] as const,
    detail: (heroId: string) => ['heroes', heroId] as const,
    skills: (heroId: string) => ['heroes', heroId, 'skills'] as const,
    effects: (heroId: string) => ['heroes', heroId, 'effects'] as const,
    oathNodes: (heroId: string) => ['heroes', heroId, 'oath-nodes'] as const,
    spells: (heroId: string) => ['heroes', heroId, 'spells'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    byHero: (heroId: string) => ['inventory', heroId] as const,
    unowned: ['inventory', 'unowned'] as const,
  },
  catalogs: {
    items: (params?: { search?: string; category?: string; page?: number; pageSize?: number }) =>
      ['catalogs', 'items', params ?? {}] as const,
    creatures: (params?: {
      search?: string;
      category?: string;
      page?: number;
      pageSize?: number;
    }) => ['catalogs', 'creatures', params ?? {}] as const,
    recipes: (station?: string) => ['catalogs', 'recipes', station ?? 'all'] as const,
    gridRecipes: (station?: string) => ['catalogs', 'grid-recipes', station ?? 'all'] as const,
    spells: (params?: { search?: string; circle?: number; affinity?: string; page?: number }) =>
      ['catalogs', 'spells', params ?? {}] as const,
    conditions: ['catalogs', 'conditions'] as const,
    effects: ['catalogs', 'effects'] as const,
    oathTree: ['catalogs', 'oath-tree'] as const,
  },
  gameState: {
    global: ['game-state'] as const,
    session: (code?: string) => ['session', code ?? 'default'] as const,
  },
  worldClock: {
    deadlines: (sessionId?: string) =>
      ['world-clock', 'deadlines', sessionId ?? 'default'] as const,
    log: (sessionId?: string) => ['world-clock', 'log', sessionId ?? 'default'] as const,
  },
  battleMap: {
    all: ['battle-maps'] as const,
    active: ['battle-maps', 'ao_vivo'] as const,
    detail: (mapId: string) => ['battle-maps', mapId] as const,
    tokens: (mapId: string) => ['battle-tokens', mapId] as const,
  },
  turnCombat: {
    active: (sessionId?: string) => ['turn-combat', sessionId ?? 'default'] as const,
    participants: (battleId: string) => ['turn-combat', battleId, 'participants'] as const,
    log: (battleId: string) => ['turn-combat', battleId, 'log'] as const,
  },
  loot: {
    pending: (heroId?: string) => ['loot', 'pending', heroId ?? 'all'] as const,
  },
  shop: {
    items: (sessionId?: string) => ['shop', 'items', sessionId ?? 'default'] as const,
  },
  missives: {
    byHero: (heroId: string) => ['missives', heroId] as const,
  },
  journal: {
    byHero: (heroId: string) => ['journal', heroId] as const,
    dmNotes: ['journal', 'dm-notes'] as const,
  },
  worldMap: {
    regions: ['world-map', 'regions'] as const,
    places: ['world-map', 'places'] as const,
    pins: ['world-map', 'pins'] as const,
  },
} as const;
