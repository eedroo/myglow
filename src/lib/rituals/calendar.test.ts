import { describe, expect, it } from 'vitest';
import type { Ritual } from '@/lib/ai/schemas';
import { googleCalendarUrl, ritualDescription, ritualIcs } from './calendar';

const ritual: Ritual = {
  id: 'lua-nova-intencoes',
  title: 'Semear na Lua Nova',
  date: '2026-10-10',
  occasion: 'Lua Nova em Libra',
  intention: 'Plantar intenções de equilíbrio; com calma.',
  area: 'MAGIC',
  durationMinutes: 20,
  materials: ['Papel', 'Caneta', 'Uma vela'],
  steps: ['Escreve três intenções.', 'Lê-as em voz alta.', 'Guarda o papel num lugar especial.'],
  safety: 'Nunca deixes a vela acesa sem vigilância.',
};
const labels = { intention: 'Intenção', materials: 'Materiais', steps: 'Passos', openApp: 'Abrir na MYGLOW' };
const link = 'https://www.myglow.onda.work/month/2026-10';

describe('rituais no calendário', () => {
  const details = ritualDescription(ritual, labels, link);

  it('descrição com intenção, materiais, passos numerados, segurança e link', () => {
    expect(details).toContain('Intenção: Plantar intenções');
    expect(details).toContain('Materiais: Papel, Caneta, Uma vela');
    expect(details).toContain('1. Escreve três intenções.\n2. Lê-as');
    expect(details).toContain('Nunca deixes a vela');
    expect(details).toContain(`Abrir na MYGLOW: ${link}`);
  });

  it('Google Calendar: evento de dia inteiro na data do ritual', () => {
    const url = new URL(googleCalendarUrl(ritual, details));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('✦ Semear na Lua Nova');
    expect(url.searchParams.get('dates')).toBe('20261010/20261011');
    expect(url.searchParams.get('details')).toBe(details);
    expect(googleCalendarUrl(ritual, 'x'.repeat(5000)).length).toBeLessThan(6000);
  });

  it('.ics válido: dia inteiro, texto escapado e linhas dobradas a 75 octetos', () => {
    const ics = ritualIcs(ritual, details, link, new Date('2026-10-03T12:00:00Z'));
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261010\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20261011\r\n');
    expect(ics).toContain('DTSTAMP:20261003T120000Z');
    expect(ics).toContain('UID:ritual-lua-nova-intencoes-20261010@myglow');
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('equilíbrio\; com calma.');
    expect(unfolded).toContain('Papel\\, Caneta');
    expect(unfolded).toContain('Passos:\\n1. Escreve');
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
