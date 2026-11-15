import { expect, test } from '@playwright/test';
import { INTERVALS } from '../src/intervals';
import { ROOTS, intervalNames } from '../src/notes';
import { clearPlays, freq, plays, recordPlays } from './helpers';

const MODES = [
  { mode: 'up', label: 'nacheinander' },
  { mode: 'down', label: 'abwärts' },
  { mode: 'together', label: 'gleichzeitig' },
] as const;

test.beforeEach(async ({ page }) => {
  await recordPlays(page);
  await page.goto('/');
  await expect(page.locator('.key')).toHaveCount(25);
});

test('alle 13 Grundtöne × 13 Tasten × 3 Wiedergabearten spielen das richtige Intervall', async ({ page }) => {
  let checked = 0;
  for (const root of ROOTS) {
    await page.locator(`button.root[data-root="${root.name}"]`).click();
    await expect(page.locator(`button.root[data-root="${root.name}"]`)).toHaveAttribute('aria-checked', 'true');
    const rootMidi = 60 + root.pitchClass;

    // Symbole wandern mit: Hammer auf dem Grundton, Regenschirm auf der Oktave
    for (const interval of INTERVALS) {
      const key = page.locator(`.key[data-midi="${rootMidi + interval.semitones}"]`);
      await expect(key).toHaveClass(/in-range/);
      const same = await page.evaluate(
        ([svg, midi]) => {
          const ref = document.createElement('span');
          ref.innerHTML = svg; // gleiche Normalisierung wie im Browser
          return document.querySelector(`.key[data-midi="${midi}"] .key-symbol`)?.innerHTML === ref.innerHTML;
        },
        [interval.symbol, String(rootMidi + interval.semitones)] as const,
      );
      expect(same, `${interval.symbolName} auf Taste ${rootMidi + interval.semitones}`).toBe(true);
    }

    for (const { mode, label } of MODES) {
      await page.getByRole('radio', { name: label, exact: true }).click();
      for (const interval of INTERVALS) {
        const targetMidi = rootMidi + interval.semitones;
        await clearPlays(page);
        await page.locator(`.key[data-midi="${targetMidi}"]`).click();

        const all = await plays(page);
        expect(all, `genau eine Wiedergabe pro Tipp (${root.name}, ${interval.short}, ${mode})`).toHaveLength(1);
        const notes = all[0];
        const rootF = freq(rootMidi);
        const targetF = freq(targetMidi);

        if (mode === 'together') {
          expect(notes.every((n) => n.offset === 0)).toBe(true);
          const fs = notes.map((n) => n.frequency).sort((a, b) => a - b);
          if (interval.semitones === 0) expect(fs).toHaveLength(1);
          else expect(fs).toHaveLength(2);
          expect(fs[0]).toBeCloseTo(rootF, 6);
          expect(fs[fs.length - 1]).toBeCloseTo(targetF, 6);
        } else {
          expect(notes).toHaveLength(2);
          const [first, second] = mode === 'up' ? [rootF, targetF] : [targetF, rootF];
          expect(notes[0].frequency).toBeCloseTo(first, 6);
          expect(notes[1].frequency).toBeCloseTo(second, 6);
          expect(notes[0].offset).toBe(0);
          expect(notes[1].offset).toBeGreaterThan(0.5);
        }
        // Verhältnis Zielton/Grundton = 2^(Halbtöne/12)
        expect(targetF / rootF).toBeCloseTo(Math.pow(2, interval.semitones / 12), 9);

        // Anzeige
        const names = intervalNames(root, interval);
        await expect(page.locator('#info-short')).toHaveText(interval.short);
        await expect(page.locator('#info-name')).toHaveText(interval.name);
        await expect(page.locator('#info-notes')).toHaveText(names.text);
        await expect(page.locator('#info-song')).toHaveText(`„${interval.song}“`);
        // Grund- und Zieltaste leuchten
        await expect(page.locator('.key.lit')).toHaveCount(interval.semitones === 0 ? 1 : 2);
        await expect(page.locator(`.key[data-midi="${rootMidi}"]`)).toHaveClass(/lit/);
        await expect(page.locator(`.key[data-midi="${targetMidi}"]`)).toHaveClass(/lit/);
        checked++;
      }
    }
  }
  expect(checked).toBe(13 * 13 * 3);
});

test('feste Prüffälle werden so angezeigt', async ({ page }) => {
  const cases: [string, number, string][] = [
    ['D', 4, 'D – Fis'],
    ['C', 3, 'C – Es'],
    ['F', 6, 'F – H'],
    ['E', 8, 'E – C'],
    ['Des', 11, 'Des – C'],
    ['H', 1, 'H – C'],
    ['Des', 1, 'Des – Eses (D)'],
  ];
  for (const [rootName, semitones, text] of cases) {
    const root = ROOTS.find((r) => r.name === rootName)!;
    await page.locator(`button.root[data-root="${rootName}"]`).click();
    await page.locator(`.key[data-midi="${60 + root.pitchClass + semitones}"]`).click();
    await expect(page.locator('#info-notes')).toHaveText(text);
  }
});

test('Tasten außerhalb des Bereichs sind abgedunkelt, ohne Symbol und spielen ihren Einzelton', async ({ page }) => {
  await page.locator('button.root[data-root="D"]').click();
  await expect(page.locator('.key.out-of-range')).toHaveCount(25 - 13);
  await expect(page.locator('.key.out-of-range .key-symbol:not([hidden])')).toHaveCount(0);

  await page.locator('.key[data-midi="62"]').click(); // Prim, damit ein Intervall gewählt ist
  await clearPlays(page);
  await page.locator('.key[data-midi="61"]').click(); // cis' – außerhalb
  const all = await plays(page);
  expect(all).toHaveLength(1);
  expect(all[0]).toHaveLength(1);
  expect(all[0][0].frequency).toBeCloseTo(freq(61), 6);
  await expect(page.locator('#status')).toHaveText('Einzelton: Cis/Des');
  // zuletzt gewähltes Intervall bleibt für „Nochmal" erhalten
  await expect(page.locator('#info-short')).toHaveText('r1');
});

test('„Nochmal" spielt das zuletzt gewählte Intervall in der aktuellen Wiedergabeart', async ({ page }) => {
  await expect(page.locator('#again')).toBeDisabled();
  await page.locator('button.root[data-root="G"]').click();
  await page.locator('.key[data-midi="71"]').click(); // gr3 über G = H
  await page.getByRole('radio', { name: 'gleichzeitig', exact: true }).click();
  await clearPlays(page);
  await page.locator('#again').click();
  const all = await plays(page);
  expect(all).toHaveLength(1);
  const fs = all[0].map((n) => n.frequency).sort((a, b) => a - b);
  expect(fs).toHaveLength(2);
  expect(fs[0]).toBeCloseTo(freq(67), 6);
  expect(fs[1]).toBeCloseTo(freq(71), 6);
  expect(all[0].every((n) => n.offset === 0)).toBe(true);
});

test('Schalter für Symbole und Liedtitel', async ({ page }) => {
  await page.locator('.key[data-midi="64"]').click();
  await expect(page.locator('.key[data-midi="64"] .key-symbol')).toBeVisible();
  await expect(page.locator('#info-song')).toBeVisible();

  await page.getByRole('switch', { name: 'Symbole' }).click();
  await expect(page.locator('.key[data-midi="64"] .key-symbol')).toBeHidden();
  await expect(page.locator('#info-symbol')).toBeHidden();

  await page.getByRole('switch', { name: 'Liedtitel' }).click();
  await expect(page.locator('#info-song')).toBeHidden();
  await expect(page.locator('#info-notes')).toHaveText('C – E');
});

test('Auswahl bleibt nach Neuladen gespeichert', async ({ page }) => {
  await page.locator('button.root[data-root="As"]').click();
  await page.getByRole('radio', { name: 'abwärts', exact: true }).click();
  await page.getByRole('switch', { name: 'Symbole' }).click();
  await page.reload();
  await expect(page.locator('button.root[data-root="As"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'abwärts', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Symbole' })).toHaveAttribute('aria-checked', 'false');
});

test('Standard beim ersten Start: Grundton C, nacheinander, alles eingeblendet', async ({ page }) => {
  await expect(page.locator('button.root[data-root="C"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'nacheinander', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Symbole' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Liedtitel' })).toHaveAttribute('aria-checked', 'true');
});

test('Tasten sind mindestens 44 px breit, Grundton-Bereich ist sichtbar', async ({ page }) => {
  for (const name of ['C', 'Fis', 'H']) {
    await page.locator(`button.root[data-root="${name}"]`).click();
    await page.waitForTimeout(700); // sanftes Scrollen abwarten
    const root = ROOTS.find((r) => r.name === name)!;
    const scroller = await page.locator('#keyboard-scroll').boundingBox();
    for (const midi of [60 + root.pitchClass, 72 + root.pitchClass]) {
      const box = await page.locator(`.key[data-midi="${midi}"]`).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(scroller!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(scroller!.x + scroller!.width + 1);
    }
  }
  const white = await page.locator('.key.white').first().boundingBox();
  expect(white!.width).toBeGreaterThanOrEqual(44);
});
