import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const scenes = [
  { id: 'ready', file: 'screenshot-ready.png' },
  { id: 'extracting', file: 'screenshot-extracting.png' },
  { id: 'complete', file: 'screenshot-complete.png' },
  { id: 'datefilter', file: 'screenshot-datefilter.png' },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  await page.goto(`file://${path.join(__dirname, 'mockup.html')}`);
  await page.waitForTimeout(500);

  for (const { id, file } of scenes) {
    const outPath = path.join(__dirname, file);
    await page.locator(`#${id}`).screenshot({ path: outPath, type: 'png' });
    console.log(`Saved ${file}`);
  }

  // Promo tiles
  const promoPage = await context.newPage();
  await promoPage.goto(`file://${path.join(__dirname, 'promo-tiles.html')}`);
  await promoPage.waitForTimeout(500);

  const promoTiles = [
    { id: 'small-tile', file: 'promo-small.png' },
    { id: 'marquee-tile', file: 'promo-marquee.png' },
  ];

  for (const { id, file } of promoTiles) {
    const outPath = path.join(__dirname, file);
    await promoPage.locator(`#${id}`).screenshot({ path: outPath, type: 'png' });
    console.log(`Saved ${file}`);
  }

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
