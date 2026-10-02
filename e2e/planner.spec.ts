import { expect, test, type Page } from '@playwright/test';
import { registerAndOnboard } from './helpers';

const saveStatus = (page: Page) => page.locator('.mg-save-status');

test('mês: intenção e meta Magic gravam e persistem', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/month');
  await page.waitForLoadState('networkidle');

  await page.locator('#month-intention').fill('Enraizar hábitos.');
  await expect(saveStatus(page)).toHaveText('Guardado');
  await page.locator('#month-project-magic').fill('Ritual de lua cheia');
  await expect(saveStatus(page)).toHaveText('Guardado');

  await page.reload();
  await expect(page.locator('#month-intention')).toHaveValue('Enraizar hábitos.');
  await expect(page.locator('#month-project-magic')).toHaveValue('Ritual de lua cheia');
});

test('ano: palavra do ano persiste e o mês da grelha abre o planner mensal', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/year');
  await page.waitForLoadState('networkidle');

  await page.locator('#year-word').fill('Raiz');
  await expect(saveStatus(page)).toHaveText('Guardado');
  await page.reload();
  await expect(page.locator('#year-word')).toHaveValue('Raiz');

  await page.locator('.mg-year-month').first().click();
  await expect(page).toHaveURL(/\/month(\/\d{4}-01)?$/);
});

test('hemisfério Sul: Samhain no início de maio', async ({ page }) => {
  await registerAndOnboard(page);

  await page.goto('/month/2026-05');
  await expect(page.getByText('Beltane · Fogo e fertilidade')).toBeVisible();

  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
  await page.locator('label:has(input[name=hemisphere][value=SOUTH])').click();
  await page.locator('#preferences').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.mg-toast--success')).toBeVisible();

  await page.goto('/month/2026-05');
  await expect(page.getByText('Samhain · O ano novo das bruxas')).toBeVisible();
});

test('rotas do ano corrigem valores inválidos', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/year/abcd');
  await expect(page).toHaveURL(/\/year$/);
  await page.goto('/year/1999');
  await expect(page).toHaveURL(/\/year$/);
  await page.goto('/year/2999');
  await expect(page).toHaveURL(/\/year$/);
});
