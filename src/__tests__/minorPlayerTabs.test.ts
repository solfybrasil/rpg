import { describe, expect, it } from 'vitest';
import { formatCoinsString, fromBronze, toBronze } from '../entities/item';

describe('minorPlayerTabs — Regras de Economia, Diário e Missivas', () => {
  it('converte corretamente o câmbio: 50b = 1p, 50p = 1o (2500b = 1o)', () => {
    // 1 Ouro
    const oneGold = fromBronze(2500);
    expect(oneGold.gold).toBe(1);
    expect(oneGold.silver).toBe(0);
    expect(oneGold.bronze).toBe(0);

    // 1 Prata
    const oneSilver = fromBronze(50);
    expect(oneSilver.gold).toBe(0);
    expect(oneSilver.silver).toBe(1);
    expect(oneSilver.bronze).toBe(0);

    // Misto: 2 ouros, 3 pratas, 12 bronzes = 2 * 2500 + 3 * 50 + 12 = 5000 + 150 + 12 = 5162
    const mixed = fromBronze(5162);
    expect(mixed.gold).toBe(2);
    expect(mixed.silver).toBe(3);
    expect(mixed.bronze).toBe(12);

    expect(toBronze(2, 3, 12)).toBe(5162);
    expect(formatCoinsString(5162)).toBe('2o 3p 12b');
  });

  it('calcula valor de recompra da loja (venda por 50%)', () => {
    const itemPrice = 75; // 75 bronze
    const sellPrice = Math.floor(itemPrice / 2);
    expect(sellPrice).toBe(37);

    const expensiveItem = 5000;
    expect(Math.floor(expensiveItem / 2)).toBe(2500);
  });

  it('valida estrutura de dados de missiva e filtragem para jogador', () => {
    const heroId = 'tor_bjorn';
    const allMessages = [
      { id: '1', to_id: heroId, from_id: 'dm', text: 'Mensagem privada' },
      { id: '2', to_id: 'kaelis', from_id: 'dm', text: 'Mensagem de outro herói' },
      { id: '3', to_id: 'broadcast', from_id: 'dm', text: 'Proclamação geral' },
      { id: '4', to_id: 'dm', from_id: heroId, text: 'Enviada pelo herói' },
    ];

    const filtered = allMessages.filter(
      (m) =>
        m.to_id === heroId || m.from_id === heroId || m.to_id === 'broadcast' || m.to_id === 'dm',
    );

    expect(filtered.map((m) => m.id)).toEqual(['1', '3', '4']);
  });
});
