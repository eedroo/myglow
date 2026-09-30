import { expect, test, type Page } from '@playwright/test';
import { registerAndOnboard, withTestDb } from './helpers';

/** Conteúdo real: content/grimoire/vida-magica/pt-BR.json (o utilizador de teste é PT-PT e lê o PT-BR). */
const LESSONS = ['o-que-e-magia', 'intencao', 'autodominio', 'autocuidado', 'abrir-e-fechar', 'usar-o-myglow'];

/** Percorre a lição até ao card final: responde às revisões (1.ª opção) e avança. */
async function finishLesson(page: Page) {
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.mg-lesson-done').isVisible()) return;
    const review = page.locator('.mg-card-review');
    if ((await review.count()) && (await review.locator('.mg-card-review__option:not([disabled])').count())) {
      await review.locator('.mg-card-review__option').first().click();
    }
    await page.getByRole('button', { name: 'Seguinte' }).click();
  }
  await expect(page.locator('.mg-lesson-done')).toBeVisible();
}

test('mapa, lição 1 até ao fim, limite de 3 por dia e rever continua possível', async ({ page }) => {
  await registerAndOnboard(page);

  // Barra: Grimório no lugar do Perfil; o avatar abre o perfil.
  await expect(page.getByRole('link', { name: 'Grimório' })).toBeVisible();
  await page.getByRole('link', { name: /^Perfil/ }).click();
  await page.waitForURL('**/profile');

  await page.goto('/grimoire');
  await expect(page.getByRole('heading', { name: 'A sua vida mágica' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lição 1: O que é magia para nós · a seguir/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lição 2: .* · bloqueada/ })).toBeVisible();

  for (const [i, slug] of LESSONS.slice(0, 3).entries()) {
    await page.goto('/grimoire');
    await page.getByRole('button', { name: new RegExp(`Lição ${i + 1}: .* · a seguir`) }).click();
    await page.getByRole('link', { name: 'Começar' }).click();
    await page.waitForURL(`**/grimoire/vida-magica/${slug}`);
    await finishLesson(page);
    await expect(page.getByText('Lição concluída')).toBeVisible();
    await expect(page.getByText(/Ainda \d (lição nova|lições novas) hoje|Volta amanhã para novas lições/).first()).toBeVisible();
    if (i === 0) {
      await page.getByRole('link', { name: 'Voltar ao mapa' }).click();
      await expect(page.getByRole('button', { name: /Lição 1: .* · concluída/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lição 2: .* · a seguir/ })).toBeVisible();
    }
  }

  // 4.ª lição no mesmo dia: mensagem do limite.
  await page.goto('/grimoire');
  await page.getByRole('button', { name: /Lição 4: .* · a seguir/ }).click();
  await expect(page.getByText('Já fizeste 3 lições hoje. O conhecimento assenta melhor com descanso — volta amanhã.')).toBeVisible();
  await page.goto('/grimoire/vida-magica/autocuidado');
  await page.waitForURL('**/grimoire?notice=daily_limit');

  // Rever a lição 1 continua possível.
  await page.getByRole('button', { name: /Lição 1: .* · concluída/ }).click();
  await page.getByRole('link', { name: 'Rever' }).click();
  await page.waitForURL('**/grimoire/vida-magica/o-que-e-magia');
  await finishLesson(page);
  await expect(page.getByText('Revisão concluída')).toBeVisible();
});

test('quiz 4/5 → cerimónia do emblema, +100 Glow e emblema no perfil', async ({ page }) => {
  const email = await registerAndOnboard(page);
  await withTestDb(async (db) => {
    const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    await db.lessonProgress.createMany({
      data: LESSONS.map((lessonSlug) => ({ userId: user.id, courseSlug: 'vida-magica', lessonSlug, completedDate: new Date('2026-01-01T00:00:00Z') })),
    });
  });

  await page.goto('/grimoire/vida-magica/quiz');
  // Respostas certas: b, b, c, a — e a última errada (4/5).
  const answers = ['Vontade + ação', 'Eu escolho a calma', 'Voltar hoje, sem culpa', 'Para acompanhar o seu sono e a sua energia', 'Fazer tudo apenas à noite'];
  for (const [i, text] of answers.entries()) {
    await page.getByRole('button', { name: text }).click();
    await expect(page.locator('.mg-quiz__explain')).toBeVisible();
    await page.getByRole('button', { name: i === answers.length - 1 ? 'Ver resultado' : 'Seguinte' }).click();
  }
  await expect(page.locator('.mg-quiz-result__score')).toHaveText('4/5');
  const ceremony = page.getByRole('dialog', { name: 'Selo da Vontade' });
  await expect(ceremony).toBeVisible();
  await expect(ceremony).toContainText('+100 Glow');
  await expect(page.locator('.mg-glow-toast')).toContainText('+100 Glow');

  const xp = await withTestDb((db) => db.xpEvent.findMany({ where: { user: { email }, source: 'COURSE_COMPLETE' } }));
  expect(xp).toHaveLength(1);
  expect(xp[0]!.refId).toBe('vida-magica');

  await ceremony.getByRole('link', { name: 'Ver no perfil' }).click();
  await page.waitForURL('**/profile');
  await expect(page.locator('.mg-badges__slot--earned')).toContainText('Selo da Vontade');
});
