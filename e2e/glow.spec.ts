import { expect, test, type Page } from '@playwright/test';
import { registerAndOnboard, withTestDb } from './helpers';

const toast = (page: Page) => page.locator('.mg-glow-toast');

async function completeMorning(page: Page) {
  await page.locator('#day-intention').fill('Brilhar com calma');
  await page.locator('.mg-period--morning .mg-check-tile').nth(0).locator('input[type=checkbox]').check();
  await page.locator('.mg-period--morning .mg-check-tile').nth(1).locator('input[type=checkbox]').check();
  await page.locator('.mg-wake .mg-mood__face').nth(3).click();
}

test('manhã completa dá +10 Glow uma única vez', async ({ page }) => {
  await registerAndOnboard(page);
  await page.waitForLoadState('networkidle');

  await completeMorning(page);
  await expect(toast(page)).toContainText('+10 Glow');
  await expect(toast(page)).toContainText('Manhã completa');
  await expect(toast(page)).toHaveCount(0, { timeout: 6000 });

  // Desmarcar e voltar a marcar: grava, mas não duplica nem retira Glow.
  const ritual = page.locator('.mg-period--morning .mg-check-tile').nth(1).locator('input[type=checkbox]');
  await ritual.uncheck();
  await expect(page.locator('.mg-save-status')).toHaveText('Guardado');
  await ritual.check();
  await expect(page.locator('.mg-save-status')).toHaveText('Guardado');
  await page.waitForTimeout(1500);
  await expect(toast(page)).toHaveCount(0);

  await expect(page.getByText('Glow de hoje 10/50')).toBeVisible();

  await page.goto('/profile');
  await expect(page.locator('.mg-journey__total')).toHaveText('10 Glow');
  await expect(page.locator('.mg-journey__level')).toContainText('Semente');
});

test('subida de nível mostra o diálogo uma única vez (mesmo se aconteceu noutro dispositivo)', async ({ page }) => {
  const email = await registerAndOnboard(page);
  await withTestDb((db) => db.user.update({ where: { email }, data: { xpTotal: 320 } }));

  await page.goto('/today');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Subiste para Broto');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(dialog).toBeHidden();

  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('dialog')).toBeHidden();

  const levelSeen = await withTestDb((db) => db.user.findUniqueOrThrow({ where: { email }, select: { levelSeen: true } }));
  expect(levelSeen.levelSeen).toBe(2);
});

test('Perfil na navegação abre a jornada', async ({ page }) => {
  await registerAndOnboard(page);
  await page.getByRole('link', { name: 'Perfil' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Cada dia é um recomeço.')).toBeVisible();
});
