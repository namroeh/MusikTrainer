// Erzeugt die App-Icons (PNG) aus den SVG-Vorlagen in scripts/icon-src/.
// Nur nötig, wenn du das Icon änderst:  npm run icons
// (braucht einen von Playwright installierten Chromium: npx playwright install chromium)
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const src = new URL('./icon-src/', import.meta.url);
const out = new URL('../public/icons/', import.meta.url);

const jobs = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['icon-maskable.svg', 'apple-touch-icon.png', 180],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [svgName, pngName, size] of jobs) {
  const svg = await readFile(new URL(svgName, src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg', `<svg width="${size}" height="${size}"`)}</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(new URL(pngName, out), png);
  console.log('geschrieben:', pngName);
}
await browser.close();
await copyFile(new URL('icon.svg', src), new URL('favicon.svg', out));
console.log('geschrieben: favicon.svg');
