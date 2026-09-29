import { expect, test } from '@playwright/test';
import { registerAndOnboard, withTestDb } from './helpers';
import horoscope from '../tests/fixtures/ai/day-horoscope.valid.json';
import personal from '../tests/fixtures/ai/day-personal.valid.json';
import rituals from '../tests/fixtures/ai/month-rituals.valid.json';

/** Conteúdo IA semeado directamente na DB (sem OpenAI): o utilizador de teste nasceu a 1990-07-15 → Sol em Caranguejo. */
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
const monthStart = `${today.slice(0, 7)}-01`;
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

function weekStartOf(date: string): string {
  const d = asDate(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

const RITUAL_TITLE = 'Semear na Lua Nova';
const monthRituals = {
  rituals: rituals.rituals.map((r, i) => ({ ...r, id: `e2e-ritual-${i}`, date: i === 1 ? today : monthStart })),
};

test('hoje mostra horóscopo, leitura pessoal e sugestões; o ritual do mês vai para a semana', async ({ page }) => {
  const email = await registerAndOnboard(page);

  await withTestDb(async (db) => {
    const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    const model = 'e2e';
    await db.signContent.createMany({
      data: [
        { kind: 'DAY_HOROSCOPE', periodStart: asDate(today), sign: 'CANCER', locale: 'PT_PT', payload: horoscope, model },
        {
          kind: 'MONTH_ENERGY', periodStart: asDate(monthStart), sign: 'CANCER', locale: 'PT_PT', model,
          payload: { headline: 'Um mês de raízes', overview: 'Energia calma para construir.', keyDates: [] },
        },
      ],
      skipDuplicates: true,
    });
    await db.userAiContent.createMany({
      data: [
        { userId: user.id, kind: 'DAY_PERSONAL', periodStart: asDate(today), locale: 'PT_PT', payload: personal, model },
        {
          userId: user.id, kind: 'MONTH_PERSONAL', periodStart: asDate(monthStart), locale: 'PT_PT', model,
          payload: { headline: 'O teu mês', reading: 'Um mês para cuidar das tuas bases.', focusAreas: [] },
        },
        { userId: user.id, kind: 'MONTH_RITUALS', periodStart: asDate(monthStart), locale: 'PT_PT', payload: monthRituals, model },
      ],
    });
  });

  await page.goto('/today');
  await page.waitForLoadState('networkidle');
  const reading = page.locator('.mg-reading').first();
  await expect(reading).toContainText('O teu signo hoje · Caranguejo');
  await expect(reading).toContainText(horoscope.headline);
  await expect(reading).toContainText(horoscope.crystal.name);
  await expect(reading).toContainText(personal.headline);
  await expect(reading).toContainText('Para inspiração e reflexão.');

  // Chip de trânsito: significado ao tocar.
  const chip = reading.locator('.mg-reading__chip').first();
  await chip.locator('summary').click();
  await expect(chip).toContainText(personal.transits[0]!.meaning);

  // Sugestões no diário.
  await expect(page.locator('#day-intention')).toHaveAttribute('placeholder', personal.intentionSuggestion);
  await expect(page.locator('#day-reflection-hint')).toHaveText(personal.reflectionQuestion);
  await page.getByRole('button', { name: 'Usar sugestão' }).click();
  await expect(page.locator('#day-intention')).toHaveValue(personal.intentionSuggestion);

  // Ritual de hoje.
  await expect(page.locator('.mg-ritual-today')).toContainText(RITUAL_TITLE);

  // Mês: abrir o ritual e adicioná-lo à semana.
  await page.goto('/month');
  await page.waitForLoadState('networkidle');
  await page.locator('.mg-rituals__item', { hasText: RITUAL_TITLE }).click();
  const dialog = page.getByRole('dialog', { name: RITUAL_TITLE });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(rituals.rituals[1]!.safety);
  await dialog.getByRole('button', { name: 'Adicionar à minha semana' }).click();
  await expect(dialog).toContainText('Adicionado à tua semana');

  const line = `✦ ${RITUAL_TITLE} (15 min)`;
  await page.goto(`/week/${weekStartOf(today)}`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`textarea[id$="${today}"]`)).toHaveValue(new RegExp(line.replace(/[()]/g, '\\$&')));

  // A nota do dia fica só com a linha do ritual.
  const note = await withTestDb(async (db) => {
    const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    const week = await db.week.findUniqueOrThrow({
      where: { userId_startDate: { userId: user.id, startDate: asDate(weekStartOf(today)) } },
      include: { dayNotes: true },
    });
    return week.dayNotes.find((n) => n.date.toISOString().startsWith(today))?.text ?? '';
  });
  expect(note).toBe(line);
});
