import { expect, test } from '@playwright/test';
import { registerAndOnboard, withTestDb } from './helpers';

/**
 * O serviço de push real (FCM) não está disponível nos testes e o Chromium headless nega sempre a permissão:
 * o PushManager e a permissão são simulados no browser.
 * Tudo o resto (service worker, permissão, server actions, DB) é real.
 */
test.use({ permissions: ['notifications'] });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const key = '__mgFakeSub';
    const fake = () => {
      const endpoint = `https://push.example.test/e2e-${Math.random().toString(36).slice(2)}`;
      return {
        endpoint,
        toJSON: () => ({ endpoint, keys: { p256dh: 'BNfakeKeyForTests', auth: 'fakeAuth' } }),
        unsubscribe: async () => {
          (window as unknown as Record<string, unknown>)[key] = null;
          return true;
        },
      };
    };
    // O Chromium headless reporta sempre "denied": simular a permissão concedida.
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';
    const proto = (window as unknown as { PushManager?: { prototype: Record<string, unknown> } }).PushManager?.prototype;
    if (!proto) return;
    proto.getSubscription = async () => (window as unknown as Record<string, unknown>)[key] ?? null;
    proto.subscribe = async () => ((window as unknown as Record<string, unknown>)[key] = fake());
  });
});

test('definições: activar neste dispositivo, enviar teste e mudar a hora da manhã', async ({ page }) => {
  const email = await registerAndOnboard(page);
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Activar neste dispositivo' }).click();
  await expect(page.getByText('Notificações activas neste dispositivo.')).toBeVisible();
  await expect
    .poll(() => withTestDb((db) => db.pushSubscription.count({ where: { user: { email } } })))
    .toBe(1);

  await page.getByRole('button', { name: 'Enviar notificação de teste' }).click();
  await expect(page.locator('.mg-notify-settings__device [role=status]').last()).not.toBeEmpty();

  await page.locator('#notify-morning-time').selectOption('07:45');
  await expect(page.getByText('Guardado')).toBeVisible();
  await page.reload();
  await expect(page.locator('#notify-morning-time')).toHaveValue('07:45');
  const prefs = await withTestDb((db) => db.notificationPrefs.findFirstOrThrow({ where: { user: { email } } }));
  expect(prefs.morningTime).toBe('07:45');

  // Convite do Grimório: activo por defeito às 10:00; muda a hora.
  await expect(page.locator('#notify-grimoire-time')).toHaveValue('10:00');
  await page.locator('#notify-grimoire-time').selectOption('09:30');
  await expect(page.getByText('Guardado')).toBeVisible();
  await expect
    .poll(() => withTestDb((db) => db.notificationPrefs.findFirstOrThrow({ where: { user: { email } } }).then((p) => p.grimoireTime)))
    .toBe('09:30');
});

test('caixa de avisos: o sino mostra 1, abrir o aviso navega e marca como lido', async ({ page }) => {
  const email = await registerAndOnboard(page);
  const id = await withTestDb(async (db) => {
    const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    const log = await db.notificationLog.create({
      data: { userId: user.id, kind: 'WEEK_START', periodKey: 'W2026-05-03', title: 'Uma semana nova começa', body: 'Planeia a tua semana.', url: '/week' },
    });
    return log.id;
  });

  await page.goto('/today');
  await page.waitForLoadState('networkidle');
  const bell = page.getByRole('button', { name: /Abrir avisos · 1 aviso por ler/ });
  await expect(bell).toBeVisible();
  await bell.click();
  const inbox = page.getByRole('dialog', { name: 'Avisos' });
  await expect(inbox).toContainText('Uma semana nova começa');
  await inbox.getByRole('button', { name: /Uma semana nova começa/ }).click();
  await page.waitForURL('**/week');
  await expect
    .poll(() => withTestDb((db) => db.notificationLog.findUniqueOrThrow({ where: { id } }).then((l) => l.readAt !== null)))
    .toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Abrir avisos', exact: true })).toBeVisible();
});
