import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

const outDir = 'C:/Users/leona/.gemini/antigravity/brain/923ad6b2-6bc8-48cf-a653-2f31317976d0';

async function run() {
  console.log('Iniciando vite preview...');
  const preview = spawn('pnpm', ['preview', '--port', '4173'], {
    cwd: 'C:/Users/leona/Downloads/peste-v2',
    shell: true,
  });

  // Aguarda o servidor estar pronto
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch('http://localhost:4173');
      if (res.ok || res.status === 200 || res.status === 404) {
        console.log('Servidor pronto na porta 4173!');
        break;
      }
    } catch (_) {}
  }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // 1. Mobile (390x844)
  console.log('Capturando Mobile (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:4173/jogador/mapa');
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({
    path: path.join(outDir, 'prompt13_jogador_mapa_mobile.png'),
    fullPage: false,
  });

  // 2. PC (1440x900)
  console.log('Capturando PC (1440x900)...');
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const pcPage = await pcContext.newPage();
  await pcPage.goto('http://localhost:4173/jogador/mapa');
  await pcPage.waitForTimeout(3000);
  await pcPage.screenshot({
    path: path.join(outDir, 'prompt13_jogador_mapa_pc.png'),
    fullPage: false,
  });

  // 3. Abrir Mapa Urbano (City Map Modal) e tirar screenshot
  console.log('Capturando Modal do Mapa da Cidade...');
  const cityButton = pcPage.locator('button:has-text("Lugares de Aldrenor")');
  if (await cityButton.isVisible()) {
    await cityButton.click();
    await pcPage.waitForTimeout(600);
  }
  const searchInput = pcPage.locator('input[type="search"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill('Fosso');
    await pcPage.waitForTimeout(500);
  }
  const placeItem = pcPage.locator('aside button:has-text("Fosso Negro")').first();
  if (await placeItem.isVisible()) {
    await placeItem.click();
    await pcPage.waitForTimeout(600);
  }
  const exploreCityBtn = pcPage.locator('button:has-text("Explorar Mapa da Cidade")').first();
  if (await exploreCityBtn.isVisible()) {
    await exploreCityBtn.click();
    await pcPage.waitForTimeout(1000);
    await pcPage.screenshot({
      path: path.join(outDir, 'prompt13_cidade_mapa_modal.png'),
      fullPage: false,
    });
  }

  await browser.close();
  preview.kill();
  console.log('Capturas concluídas com sucesso!');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
