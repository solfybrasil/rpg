import path from 'path';
import { test } from '@playwright/test';

const ARTIFACTS_DIR = 'C:\\Users\\leona\\.gemini\\antigravity\\brain\\923ad6b2-6bc8-48cf-a653-2f31317976d0';
const BASE_URL = 'http://127.0.0.1:4173';

test.describe('Lote 2: Telas do Jogador (Pedra e Pergaminho + Mobile)', () => {
  test('Capturar Telas do Jogador em Mobile (390x844) e PC (1440x900)', async ({ page }) => {
    test.setTimeout(180000);

    // 1. Santuário de Heróis (/) - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_santuario_mobile.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_santuario_pc.png'),
      fullPage: false,
    });

    // 2. /jogador/ficha - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/jogador/ficha`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_ficha_mobile.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/jogador/ficha`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_ficha_pc.png'),
      fullPage: false,
    });

    // 3. /jogador/mochila - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/jogador/mochila`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_mochila_mobile.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/jogador/mochila`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_mochila_pc.png'),
      fullPage: false,
    });

    // 4. /jogador/grimorio - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/jogador/grimorio`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_grimorio_mobile.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/jogador/grimorio`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_grimorio_pc.png'),
      fullPage: false,
    });

    // 5. /jogador/diario - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/jogador/diario`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_diario_mobile.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/jogador/diario`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_diario_pc.png'),
      fullPage: false,
    });

    // 6. /jogador/oficina - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/jogador/oficina`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_oficina_mobile.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/jogador/oficina`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_oficina_pc.png'),
      fullPage: false,
    });

    // 7. /jogador/dados - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/jogador/dados`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_dados_mobile.png'),
      fullPage: false,
    });

    // 8. /jogador/missivas - Mobile & PC
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/jogador/missivas`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote2_jogador_missivas_mobile.png'),
      fullPage: false,
    });
  });
});
