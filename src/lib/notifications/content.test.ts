import { describe, expect, it } from 'vitest';
import type { Locale, MoonPhase, NotificationKind } from '@prisma/client';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import { getCatalog, getCourse } from '@/lib/grimoire/content';
import { MAX_BODY, MAX_TITLE, MOON_EMOJI, buildNotification, dailyVariant, testNotification } from './content';

const LOCALES: Locale[] = ['PT_PT', 'PT_BR', 'EN'];
const KINDS: NotificationKind[] = [
  'MORNING', 'BODY', 'NIGHT', 'WEEK_START', 'WEEK_END', 'MONTH_START', 'MONTH_END',
  'WEEK_PLAN_LAST', 'WEEK_REFLECTION_LAST', 'MONTH_PLAN_LAST', 'MONTH_REFLECTION_LAST', 'GRIMOIRE', 'GRIMOIRE_LAST',
  'FRIEND_REQUEST', 'FRIEND_ACCEPTED',
];
const PHASES = Object.keys(MOON_EMOJI) as MoonPhase[];
const base = { date: '2026-05-06', tz: 'Europe/Lisbon' };

describe('buildNotification', () => {
  it('títulos ≤ 50 e corpos ≤ 110 em todas as línguas, kinds e variantes, sem truncar', () => {
    for (const locale of LOCALES) {
      for (const kind of KINDS) {
        for (const phase of PHASES) {
          for (const sign of ZODIAC_ORDER) {
            for (const extra of [
              {}, { ritualToday: 'Libertar com a Lua Cheia de Escorpião' }, { sabbatToday: 'LUGHNASADH' as const },
              { grimoire: { lessonsLeft: 3, quizPending: false } }, { grimoire: { lessonsLeft: 1, quizPending: false } },
              { grimoire: { lessonsLeft: 0, quizPending: true } },
            ]) {
              const n = buildNotification(kind, { ...base, locale, moon: { phase, sign }, ...extra });
              expect(n.title.length, `${locale} ${kind} ${phase} ${sign}: ${n.title}`).toBeLessThanOrEqual(MAX_TITLE);
              expect(n.body.length).toBeLessThanOrEqual(MAX_BODY);
              expect(n.title.endsWith('…'), n.title).toBe(false);
              expect(n.url).toMatch(/^\/((today|week|month|grimoire|friends)(\/[\d-]+)?|guided\/(day|week|month)\/[\d-]+\/(morning|body|night|plan|close))$/);
            }
          }
        }
      }
      const test = testNotification(locale);
      expect(test.title.length).toBeLessThanOrEqual(MAX_TITLE);
    }
  });

  it('emoji certo por fase e texto na língua', () => {
    const n = buildNotification('MORNING', { ...base, locale: 'PT_PT', moon: { phase: 'WAXING_CRESCENT', sign: 'TAURUS' } });
    expect(n.title).toBe('Crescente em Touro 🌒');
    // Sem leitura pronta: uma das variantes (muda de dia para dia).
    expect(['Qual é a tua intenção para hoje?', 'O dia ainda está em branco. Escreve a primeira linha.', 'Uma intenção chega. Escolhe-a antes do café.']).toContain(n.body);
    expect(buildNotification('NIGHT', { ...base, locale: 'EN', moon: { phase: 'FULL_MOON', sign: 'LIBRA' } }).title).toContain('🌕');
  });

  it('ritual e sabbat do dia mudam o corpo da manhã', () => {
    const moon = { phase: 'NEW_MOON' as const, sign: 'LIBRA' as const };
    expect(buildNotification('MORNING', { ...base, locale: 'PT_BR', moon, ritualToday: 'Semear' }).body).toBe('Hoje tem ritual: Semear');
    expect(buildNotification('MORNING', { ...base, locale: 'EN', moon, sabbatToday: 'SAMHAIN' }).body).toBe("Today is Samhain. What's your intention?");
  });

  it('semana e mês levam à página certa e mostram o Glow', () => {
    const w = buildNotification('WEEK_START', { ...base, locale: 'PT_PT' });
    // F18: abrem o modo guiado (2026-05-06 é quarta: semana de 2026-05-03).
    expect(w.url).toBe('/guided/week/2026-05-03/plan');
    expect(w.body).toContain('20 Glow');
    expect(buildNotification('MONTH_END', { ...base, locale: 'EN' }).url).toBe('/guided/month/2026-05/close');
    expect(buildNotification('WEEK_END', { ...base, locale: 'EN' }).url).toBe('/guided/week/2026-05-03/close');
    expect(buildNotification('MORNING', { ...base, locale: 'EN' }).url).toBe('/guided/day/2026-05-06/morning');
    expect(buildNotification('BODY', { ...base, locale: 'EN' }).url).toBe('/guided/day/2026-05-06/body');
    expect(buildNotification('NIGHT', { ...base, locale: 'EN' }).url).toBe('/guided/day/2026-05-06/night');
  });
});

describe('convites e última chamada', () => {
  const moon = { phase: 'NEW_MOON' as const, sign: 'LIBRA' as const };

  it('manhã com a leitura pronta: título = headline da leitura', () => {
    const n = buildNotification('MORNING', { ...base, locale: 'PT_BR', moon, dayHeadline: 'Coragem com os pés na terra' });
    expect(n.title).toBe('Coragem com os pés na terra');
    expect(n.body).toBe('Sua mensagem do dia está pronta. Qual é a sua intenção?');
    const withRitual = buildNotification('MORNING', { ...base, locale: 'PT_PT', moon, dayHeadline: 'X', ritualToday: 'Semear' });
    expect(withRitual.body).toBe('Hoje há ritual: Semear');
  });

  it('semana e mês com a leitura pronta', () => {
    expect(buildNotification('WEEK_START', { ...base, locale: 'PT_BR', weekHeadline: 'Tema' })).toMatchObject({
      title: 'Tema', body: 'O tema da sua semana chegou. Que tal planejar a semana?', url: '/guided/week/2026-05-03/plan',
    });
    expect(buildNotification('MONTH_START', { ...base, locale: 'PT_BR', monthHeadline: 'Mês', monthRituals: 4 }).body).toBe(
      'Seu mês está pronto, com 4 rituais. Defina sua intenção.',
    );
    expect(buildNotification('MONTH_START', { ...base, locale: 'EN', monthHeadline: 'M', monthRituals: 0 }).body).toBe(
      'Your month is ready. Set your intention.',
    );
  });

  it('F13: retrospectiva por ver no início da semana e do mês', () => {
    const recapUrl = { week: '/recap/week/2026-05-03?auto=1', month: '/recap/month/2026-04?auto=1' };
    expect(buildNotification('WEEK_START', { ...base, locale: 'PT_BR', weekHeadline: 'Tema', recapUrl })).toMatchObject({
      title: 'Tema', body: 'A sua retrospectiva está pronta. Veja e planeje a semana.', url: recapUrl.week,
    });
    expect(buildNotification('MONTH_START', { ...base, locale: 'PT_PT', recapUrl })).toMatchObject({ url: recapUrl.month });
    expect(buildNotification('WEEK_START', { ...base, locale: 'EN', recapUrl: { month: recapUrl.month } }).url).toBe('/guided/week/2026-05-03/plan');
    for (const locale of LOCALES) {
      for (const kind of ['WEEK_START', 'MONTH_START'] as const) {
        expect(buildNotification(kind, { ...base, locale, recapUrl }).body.length).toBeLessThanOrEqual(MAX_BODY);
      }
    }
  });

  it('F15: pedidos e aceitações de amizade nas 3 línguas, com o nome e a abrir /friends', () => {
    const want = {
      PT_BR: ['Ana quer ser seu amigo no MYGLOW', 'Ana aceitou o seu pedido'],
      PT_PT: ['Ana quer ser teu amigo no MYGLOW', 'Ana aceitou o teu pedido'],
      EN: ['Ana wants to be your friend on MYGLOW', 'Ana accepted your request'],
    } as const;
    for (const locale of LOCALES) {
      const req = buildNotification('FRIEND_REQUEST', { ...base, locale, friendName: 'Ana' });
      const acc = buildNotification('FRIEND_ACCEPTED', { ...base, locale, friendName: 'Ana' });
      expect([req.title, acc.title]).toEqual(want[locale]);
      expect(req.url).toBe('/friends');
      expect(acc.url).toBe('/friends');
      expect(req.body.length).toBeGreaterThan(0);
    }
  });

  it('última chamada da reflexão abre o período anterior', () => {
    expect(buildNotification('WEEK_REFLECTION_LAST', { ...base, locale: 'PT_PT', periodKey: 'W2026-05-03' }).url).toBe('/week/2026-05-03');
    expect(buildNotification('MONTH_REFLECTION_LAST', { ...base, locale: 'PT_PT', periodKey: 'M2026-05' }).url).toBe('/month/2026-05');
    expect(buildNotification('WEEK_PLAN_LAST', { ...base, locale: 'PT_BR' }).body).toContain('20 Glow');
  });

  it('Grimório: lições do dia, quiz por fazer e última chamada', () => {
    const g = (lessonsLeft: number, quizPending = false) => ({ grimoire: { lessonsLeft, quizPending } });
    expect(buildNotification('GRIMOIRE', { ...base, locale: 'PT_BR', ...g(3) })).toEqual({
      title: 'Suas lições de hoje estão liberadas 📖',
      body: 'Suas 3 lições de hoje já estão esperando no Grimório. São só alguns minutos.',
      url: '/grimoire',
    });
    expect(buildNotification('GRIMOIRE', { ...base, locale: 'PT_PT', ...g(1) }).body).toBe(
      'A tua lição de hoje já está disponível no Grimório. São só uns minutos.',
    );
    expect(buildNotification('GRIMOIRE', { ...base, locale: 'EN', ...g(0, true) }).body).toContain('100 Glow');
    expect(buildNotification('GRIMOIRE_LAST', { ...base, locale: 'PT_BR', ...g(2) }).body).toBe(
      'Faltam 2 lições de hoje no Grimório. Que tal fechar o dia aprendendo?',
    );
    expect(buildNotification('GRIMOIRE_LAST', { ...base, locale: 'PT_PT', ...g(1) }).body).toMatch(/^Falta 1 lição/);
  });
});

describe('avisos com conteúdo (v6)', () => {
  const dates = ['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09'];
  const lessons = getCatalog().flatMap((e) => getCourse(e.slug, 'pt-BR')?.lessons ?? []);
  const nextOf = (i: number) => {
    const l = lessons[i % lessons.length]!;
    const hooks = [l.hook, ...l.cards.map((c) => (c.type === 'reflection' ? c.prompt : c.type === 'didYouKnow' ? c.body : 'title' in c ? c.title : ''))];
    return { lesson: l.title, minutes: l.minutes, hooks: hooks.filter((h): h is string => !!h) };
  };

  it('rodízio: dois dias seguidos nunca repetem a variante', () => {
    for (let d = 0; d < 30; d++) {
      const a = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
      const b = new Date(Date.UTC(2026, 0, 2 + d)).toISOString().slice(0, 10);
      expect(dailyVariant(a, 3)).not.toBe(dailyVariant(b, 3));
    }
  });

  it('todas as variantes cabem sem cortar, em todas as línguas e dias', () => {
    for (const locale of LOCALES) {
      for (const date of dates) {
        for (const kind of ['MORNING', 'BODY', 'NIGHT'] as const) {
          const x = buildNotification(kind, { ...base, date, locale, moon: { phase: 'WANING_GIBBOUS', sign: 'SAGITTARIUS' } });
          expect(x.title.endsWith('…') || x.body.endsWith('…'), `${locale} ${kind} ${date}: ${x.title} / ${x.body}`).toBe(false);
        }
      }
    }
  });

  it('manhã: corpo = intenção sugerida; noite: corpo = pergunta de reflexão', () => {
    const intention = 'Hoje eu digo não sem pedir desculpas.';
    expect(buildNotification('MORNING', { ...base, locale: 'PT_BR', dayHeadline: 'Nem toda mensagem merece resposta hoje.', dayIntention: intention }))
      .toMatchObject({ title: 'Nem toda mensagem merece resposta hoje.', body: intention });
    const q = 'O que você evitou dizer hoje?';
    expect(buildNotification('NIGHT', { ...base, locale: 'PT_BR', dayQuestion: q }).body).toBe(q);
  });

  it('Grimório: a próxima lição pelo nome e um gancho dela, sem cortar; à noite outro gancho', () => {
    for (const locale of LOCALES) {
      for (const date of dates) {
        for (let i = 0; i < lessons.length; i++) {
          const next = nextOf(i);
          const g = { grimoire: { lessonsLeft: 2, quizPending: false, next } };
          const m = buildNotification('GRIMOIRE', { ...base, date, locale, ...g });
          const n = buildNotification('GRIMOIRE_LAST', { ...base, date, locale, ...g });
          for (const x of [m, n]) {
            expect(x.title.length, x.title).toBeLessThanOrEqual(MAX_TITLE);
            expect(x.body.length).toBeLessThanOrEqual(MAX_BODY);
            expect(x.url).toBe('/grimoire');
          }
          expect(next.hooks).toContain(m.body.endsWith('…') ? next.hooks.find((h) => m.body.startsWith(h.slice(0, 20))) : m.body);
          const fit = next.hooks.filter((h) => h.length <= MAX_BODY);
          if (fit.length > 1) expect(n.body).not.toBe(m.body);
          if (fit.length) expect(m.body.endsWith('…')).toBe(false);
        }
      }
    }
  });
});
