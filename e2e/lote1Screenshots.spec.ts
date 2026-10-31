import path from 'path';
import { test } from '@playwright/test';

const ARTIFACTS_DIR = 'C:\\Users\\leona\\.gemini\\antigravity\\brain\\923ad6b2-6bc8-48cf-a653-2f31317976d0';
const REF_HTML_PATH = 'file:///C:/Users/leona/OneDrive/Área%20de%20Trabalho/0102/imagem%20rpg/referencia_painel.html';

test.describe('Lote 1: Pedra e Pergaminho Screenshots & Animations', () => {
  test('Capturar Referência Visual e Telas de /design', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Referência Visual
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(REF_HTML_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote1_referencia_painel.png'),
      fullPage: false,
    });

    // 2. /design no Celular (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4173/design', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote1_design_mobile.png'),
      fullPage: true,
    });

    // 3. /design no PC (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:4173/design', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote1_design_pc.png'),
      fullPage: false,
    });

    // 4. Simulação: Dano (-5) com Orbe balançando e vinheta vermelha
    const btnDano = page.locator('button:has-text("Simular Dano")');
    await btnDano.click();
    await page.waitForTimeout(120);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote1_animacao_dano.png'),
      fullPage: false,
    });

    // 5. Simulação: Cura (+4) com partículas verdes
    const btnCura = page.locator('button:has-text("Simular Cura")');
    await btnCura.click();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote1_animacao_cura.png'),
      fullPage: false,
    });

    // 6. Simulação: Concluir Missão (Carimbo com ease-heavy)
    const btnMissao = page.locator('button:has-text("Concluir Missão")');
    await btnMissao.click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote1_animacao_carimbo_missao.png'),
      fullPage: false,
    });

    // 7. Simulação: Momento Épico - Subir de Nível
    const btnNivel = page.locator('button:has-text("Subir Nível")');
    await btnNivel.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'lote1_animacao_momento_epico_nivel.png'),
      fullPage: false,
    });
  });
});
