import { expect, test } from '@playwright/test';
import { registerAndOnboard, withTestDb } from './helpers';

test('novidades: quem já usava a app vê o curso novo e os lançamentos uma única vez', async ({ page }) => {
  const email = await registerAndOnboard(page);
  // Conta "antiga": registada antes dos lançamentos.
  await withTestDb((db) => db.user.update({ where: { email }, data: { createdAt: new Date('2026-09-01T12:00:00Z') } }));

  await page.goto('/today');
  const dialog = page.getByRole('dialog', { name: 'Novidades MYGLOW' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Curso «Rituais do cotidiano» já disponível no Grimório');
  await expect(dialog).toContainText('Curso «Corpo e energia» já disponível no Grimório');
  await expect(dialog).toContainText('Grimório: a tua trilha de conhecimento');
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await expect(dialog).toBeHidden();

  await expect
    .poll(() => withTestDb((db) => db.announcementSeen.count({ where: { user: { email } } })))
    .toBe(3);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('dialog', { name: 'Novidades MYGLOW' })).toBeHidden();
});

test('novidades: conta nova não vê o que foi lançado antes de se registar', async ({ page }) => {
  await registerAndOnboard(page);
  await page.goto('/grimoire');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('dialog', { name: 'Novidades MYGLOW' })).toBeHidden();
});
