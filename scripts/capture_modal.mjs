import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

const outDir = 'C:/Users/leona/.gemini/antigravity/brain/923ad6b2-6bc8-48cf-a653-2f31317976d0';

async function run() {
  const preview = spawn('pnpm', ['preview', '--port', '4173'], {
    cwd: 'C:/Users/leona/Downloads/peste-v2',
    shell: true,
  });

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch('http://localhost:4173');
      if (res.ok || res.status === 200 || res.status === 404) {
        break;
      }
    } catch (_) {}
  }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await pcContext.newPage();
  await page.goto('http://localhost:4173/jogador/mapa');
  await page.waitForTimeout(2000);

  // 1. Clicar no botão para abrir o painel lateral
  console.log('Abrindo painel...');
  const openBtn = page.getByRole('button', { name: /Lugares de Aldrenor/i });
  if (await openBtn.isVisible()) {
    await openBtn.click();
    await page.waitForTimeout(600);
  }

  // 2. Buscar por "Fosso" no campo de busca para filtrar diretamente
  console.log('Buscando Fosso...');
  const searchInput = page.locator('input[type="search"]');
  await searchInput.fill('Fosso');
  await page.waitForTimeout(600);

  // 3. Clicar no lugar "Fosso Negro"
  console.log('Selecionando Fosso Negro...');
  const fossoItem = page.locator('aside button:has-text("Fosso Negro")').first();
  await fossoItem.click();
  await page.waitForTimeout(600);

  // 4. Clicar no botão "Explorar Mapa da Cidade"
  console.log('Clicando em Explorar Mapa da Cidade...');
  const cityModalBtn = page.getByRole('button', { name: /Explorar Mapa da Cidade/i });
  await cityModalBtn.click();
  await page.waitForTimeout(1000);

  // 4. Capturar screenshot do modal aberto
  await page.screenshot({
    path: path.join(outDir, 'prompt13_cidade_mapa_modal.png'),
    fullPage: false,
  });

  console.log('Modal capturado com sucesso!');
  await browser.close();
  preview.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
