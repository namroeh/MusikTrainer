import { expect, test, type Page } from '@playwright/test';
import { intervalBySemitones } from '../src/intervals';
import { findRoot, intervalNames } from '../src/notes';
import { clearPlays, plays, recordPlays } from './helpers';

test.beforeEach(async ({ page }) => {
  await recordPlays(page);
  await page.goto('/');
  await expect(page.locator('.key')).toHaveCount(25);
});

async function openQuiz(page: Page) {
  await page.getByRole('radio', { name: 'Quiz', exact: true }).click();
  await expect(page.locator('.quiz-panel')).toBeVisible();
}

/** Startet bzw. holt die nächste Frage und liefert Grund- und Zieltaste (Wiedergabe „nacheinander"). */
async function nextQuestion(page: Page): Promise<{ root: number; target: number }> {
  await clearPlays(page);
  await page.locator('#quiz-next').click();
  const all = await plays(page);
  expect(all).toHaveLength(1);
  const [first, second] = all[0];
  return { root: first.midi, target: second.midi };
}

const stats = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('intervall-trainer:quiz-statistik') ?? '{}'));

test('Quiz per Taste: richtige Antwort mit Auflösung und Zähler', async ({ page }) => {
  await openQuiz(page);
  await expect(page.locator('#quiz-next')).toHaveText('Start');
  await expect(page.locator('#quiz-replay')).toBeDisabled();

  const { root, target } = await nextQuestion(page);
  expect(root).toBe(60); // fester Grundton = gewählter (Standard C)
  await expect(page.locator(`.key[data-midi="${root}"]`)).toHaveClass(/lit/);
  await expect(page.locator('#quiz-status')).toContainText('Welches Intervall');

  await page.locator(`.key[data-midi="${target}"]`).click();
  const interval = intervalBySemitones(target - root)!;
  await expect(page.locator('#quiz-status')).toHaveText('Richtig!');
  await expect(page.locator('#quiz-score')).toHaveText('Richtig: 1 von 1');
  await expect(page.locator('#quiz-short')).toHaveText(interval.short);
  await expect(page.locator('#quiz-name')).toHaveText(interval.name);
  await expect(page.locator('#quiz-notes')).toHaveText(intervalNames(findRoot('C')!, interval).text);
  await expect(page.locator('#quiz-song')).toHaveText(`„${interval.song}“`);
  await expect(page.locator(`.key[data-midi="${target}"]`)).toHaveClass(/lit/);
  expect((await stats(page))[target - root]).toEqual({ asked: 1, wrong: 0, score: 0 });

  // „Nochmal hören" spielt dieselbe Frage
  await clearPlays(page);
  await page.locator('#quiz-replay').click();
  const again = await plays(page);
  expect(again[0].map((n) => n.midi)).toEqual([root, target]);
});

test('Quiz per Taste: falsche Antwort wird markiert und öfter geübt', async ({ page }) => {
  await openQuiz(page);
  const { root, target } = await nextQuestion(page);
  const wrong = target === root + 12 ? root + 11 : target + 1;
  await page.locator(`.key[data-midi="${wrong}"]`).click();

  await expect(page.locator('#quiz-status')).toHaveText('Leider falsch');
  await expect(page.locator('#quiz-score')).toHaveText('Richtig: 0 von 1');
  await expect(page.locator(`.key[data-midi="${wrong}"]`)).toHaveClass(/wrong/);
  await expect(page.locator(`.key[data-midi="${target}"]`)).toHaveClass(/lit/);
  await expect(page.locator('#quiz-hint')).toContainText(`Deine Antwort: ${intervalBySemitones(wrong - root)!.short}`);
  expect((await stats(page))[target - root]).toEqual({ asked: 1, wrong: 1, score: 3 });

  // Lernstand löschen – im Hochformat direkt im Quiz, sonst im Info-Fenster
  if (await page.locator('#quiz-forget').isVisible()) {
    await page.locator('#quiz-forget').click();
  } else {
    await page.getByRole('button', { name: 'Info und Installation' }).click();
    await page.getByRole('button', { name: 'Quiz-Lernstand zurücksetzen' }).click();
    await expect(page.locator('#about-forget-done')).toBeVisible();
  }
  expect(await stats(page)).toEqual({});
});

test('Lernstand im Info-Fenster zurücksetzen', async ({ page }) => {
  await openQuiz(page);
  const { root, target } = await nextQuestion(page);
  await page.locator(`.key[data-midi="${target === root + 12 ? root + 11 : target + 1}"]`).click();
  expect(Object.keys(await stats(page))).toHaveLength(1);
  await page.getByRole('button', { name: 'Info und Installation' }).click();
  await page.getByRole('button', { name: 'Quiz-Lernstand zurücksetzen' }).click();
  await expect(page.locator('#about-forget-done')).toBeVisible();
  expect(await stats(page)).toEqual({});
  await page.keyboard.press('Escape');
  await expect(page.locator('#quiz-forget')).toBeHidden();
});

test('Quiz aus der Liste', async ({ page }) => {
  await openQuiz(page);
  await expect(page.locator('#quiz-list')).toBeHidden();
  await page.getByRole('radio', { name: 'Liste', exact: true }).click();
  await expect(page.locator('#quiz-list .qchip')).toHaveCount(13);

  const { root, target } = await nextQuestion(page);
  const chip = page.locator(`.qchip[data-semitones="${target - root}"]`);
  await chip.click();
  await expect(page.locator('#quiz-status')).toHaveText('Richtig!');
  await expect(chip).toHaveClass(/correct/);

  // nächste Frage, diesmal falsch
  const q2 = await nextQuestion(page);
  const s2 = q2.target - q2.root;
  const wrongS = s2 === 12 ? 11 : s2 + 1;
  await page.locator(`.qchip[data-semitones="${wrongS}"]`).click();
  await expect(page.locator('#quiz-status')).toHaveText('Leider falsch');
  await expect(page.locator(`.qchip[data-semitones="${wrongS}"]`)).toHaveClass(/wrong/);
  await expect(page.locator(`.qchip[data-semitones="${s2}"]`)).toHaveClass(/correct/);
  await expect(page.locator('#quiz-score')).toHaveText('Richtig: 1 von 2');
});

test('Grundton zufällig: wechselnde Grundtöne, Symbole wandern mit', async ({ page }) => {
  await openQuiz(page);
  await page.locator('#quiz-root').selectOption('zufällig');
  const roots = new Set<number>();
  for (let i = 0; i < 15; i++) {
    const { root } = await nextQuestion(page);
    roots.add(root);
    await expect(page.locator(`.key[data-midi="${root}"]`)).toHaveClass(/is-root/);
    await expect(page.locator(`.key[data-midi="${root + 12}"]`)).toHaveClass(/is-octave/);
    await page.locator('#quiz-next').click(); // Auflösen
    await expect(page.locator('#quiz-status')).toHaveText('Aufgelöst');
  }
  expect(roots.size).toBeGreaterThan(1);
});

test('Grundton fest = der im Lernen gewählte', async ({ page }) => {
  await page.locator('button.root[data-root="Es"]').click();
  await openQuiz(page);
  await expect(page.locator('#quiz-root')).toHaveValue('Es');
  const { root } = await nextQuestion(page);
  expect(root).toBe(63);
  await expect(page.locator('#quiz-status')).toContainText('Grundton: Es');

  // Auswahl im Quiz ändert auch den Grundton im Lernen-Bereich
  await page.locator('#quiz-root').selectOption('A');
  await page.getByRole('radio', { name: 'Lernen', exact: true }).click();
  await expect(page.locator('button.root[data-root="A"]')).toHaveAttribute('aria-checked', 'true');
});

test('Quiz in allen drei Wiedergabearten', async ({ page }) => {
  await openQuiz(page);
  await page.getByRole('radio', { name: 'abwärts', exact: true }).click();
  await clearPlays(page);
  await page.locator('#quiz-next').click();
  let notes = (await plays(page))[0];
  expect(notes[0].midi).toBeGreaterThanOrEqual(notes[1].midi); // erst oben, dann Grundton
  expect(notes[1].midi).toBe(60);

  await page.getByRole('radio', { name: 'gleichzeitig', exact: true }).click();
  await clearPlays(page);
  await page.locator('#quiz-replay').click();
  notes = (await plays(page))[0];
  expect(notes.every((n) => n.offset === 0)).toBe(true);
});

test('Tasten außerhalb des Bereichs zählen nicht als Antwort; danach Tasten zum Vergleichen', async ({ page }) => {
  await page.locator('button.root[data-root="G"]').click();
  await openQuiz(page);
  const { root, target } = await nextQuestion(page);
  expect(root).toBe(67);

  await page.locator('.key[data-midi="60"]').click(); // c' – unter dem Grundton
  await expect(page.locator('#quiz-hint')).toContainText('zwischen Grundton und Oktave');
  await expect(page.locator('#quiz-score')).toHaveText('Richtig: 0 von 0');

  await page.locator(`.key[data-midi="${target}"]`).click();
  await expect(page.locator('#quiz-score')).toHaveText('Richtig: 1 von 1');

  // nach der Antwort: andere Taste spielt das Intervall ab Grundton, Zähler bleibt
  const other = target === root ? root + 7 : root;
  await clearPlays(page);
  await page.locator(`.key[data-midi="${other}"]`).click();
  const notes = (await plays(page))[0];
  expect(notes[0].midi).toBe(root);
  await expect(page.locator('#quiz-score')).toHaveText('Richtig: 1 von 1');
});

test('Quiz-Einstellungen bleiben nach Neuladen erhalten', async ({ page }) => {
  await openQuiz(page);
  await page.getByRole('radio', { name: 'Liste', exact: true }).click();
  await page.locator('#quiz-root').selectOption('zufällig');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Quiz', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Liste', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#quiz-root')).toHaveValue('zufällig');
  await expect(page.locator('#quiz-list .qchip')).toHaveCount(13);
});

test('Zurück zum Lernen: Lernen funktioniert wie vorher', async ({ page }) => {
  await openQuiz(page);
  await nextQuestion(page);
  await page.getByRole('radio', { name: 'Lernen', exact: true }).click();
  await expect(page.locator('.quiz-panel')).toBeHidden();
  await expect(page.locator('.key.wrong')).toHaveCount(0);
  await page.locator('.key[data-midi="64"]').click();
  await expect(page.locator('#info-notes')).toHaveText('C – E');
});
