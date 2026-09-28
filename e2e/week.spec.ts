import { expect, test, type Page } from '@playwright/test';
import { registerAndOnboard } from './helpers';

const saveStatus = (page: Page) => page.locator('.mg-save-status');

test('a semana grava automaticamente e persiste depois de recarregar', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/week');
  await page.waitForLoadState('networkidle');

  // Terça-feira = 3.ª linha (a semana começa ao domingo).
  const tuesday = page.locator('.mg-week-day').nth(2).locator('textarea');
  await tuesday.fill('Dentista às 10h');
  await expect(saveStatus(page)).toHaveText('Guardado');

  await page.locator('#week-weight').fill('76,4');
  await page.locator('#week-weight').press('Tab');
  await expect(saveStatus(page)).toHaveText('Guardado');

  await page.locator('#project-magic').fill('Ritual de lua nova');
  await expect(saveStatus(page)).toHaveText('Guardado');

  await page.reload();
  await expect(page.locator('.mg-week-day').nth(2).locator('textarea')).toHaveValue('Dentista às 10h');
  await expect(page.locator('#week-weight')).toHaveValue('76,4');
  await expect(page.locator('#project-magic')).toHaveValue('Ritual de lua nova');
});

test('peso inválido mostra erro e não grava', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/week');
  await page.waitForLoadState('networkidle');

  await page.locator('#week-weight').fill('abc');
  await page.locator('#week-weight').press('Tab');
  await expect(page.getByText('Escreve o peso em kg, por exemplo 76,4.')).toBeVisible();
});

test('os pontos de um dia passado abrem esse dia', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/week');
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: 'Semana anterior' }).click();
  await page.waitForURL(/\/week\/\d{4}-\d{2}-\d{2}$/);
  await page.locator('.mg-week-day__progress a').first().click();
  await expect(page).toHaveURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
});

test('rotas da semana e do mês corrigem datas inválidas', async ({ page }) => {
  await registerAndOnboard(page);

  // 6 de maio de 2026 é uma quarta → redirecciona para o domingo 3.
  await page.goto('/week/2026-05-06');
  await expect(page).toHaveURL(/\/week\/2026-05-03$/);
  await page.goto('/week/nao-e-data');
  await expect(page).toHaveURL(/\/week$/);
  await page.goto('/month/2026-13');
  await expect(page).toHaveURL(/\/month$/);

  await page.goto('/month/2026-05');
  await expect(page.getByText('Lua Cheia em Escorpião')).toBeVisible();
});
