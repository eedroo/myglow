import { addDays, type DateISO } from '@/lib/dates';
import type { Ritual } from '@/lib/ai/schemas';

/**
 * Rituais para calendários externos: link de evento do Google Calendar (sem login nem API) e ficheiro .ics
 * (Apple Calendar, Outlook…). Evento de dia inteiro na data do ritual — os rituais não têm hora. Puro.
 */
export interface RitualCalendarLabels {
  intention: string;
  materials: string;
  steps: string;
  openApp: string;
}

const MAX_DETAILS = 1800; // o URL do Google tem limite prático; o .ics não

const compact = (d: DateISO) => d.replaceAll('-', '');

/** Texto da descrição do evento (ocasião, intenção, materiais, passos, segurança e link para a app). */
export function ritualDescription(r: Ritual, labels: RitualCalendarLabels, link: string): string {
  const parts = [
    r.occasion,
    `${labels.intention}: ${r.intention}`,
    r.materials.length ? `${labels.materials}: ${r.materials.join(', ')}` : '',
    `${labels.steps}:\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    r.safety,
    `${labels.openApp}: ${link}`,
  ].filter(Boolean);
  return parts.join('\n\n');
}

/** Link "criar evento" do Google Calendar (abre a app ou o site com o evento preenchido). */
export function googleCalendarUrl(r: Ritual, details: string): string {
  const text = details.length > MAX_DETAILS ? `${details.slice(0, MAX_DETAILS - 1)}…` : details;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `✦ ${r.title}`,
    dates: `${compact(r.date)}/${compact(addDays(r.date, 1))}`,
    details: text,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escapa texto para iCalendar (RFC 5545 §3.3.11). */
function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Dobra linhas longas (máx. 75 octetos; continuação começa com espaço), sem partir caracteres UTF-8. */
function fold(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Ficheiro .ics com um evento de dia inteiro. */
export function ritualIcs(r: Ritual, details: string, link: string, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Onda//MYGLOW//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:ritual-${r.id}-${compact(r.date)}@myglow`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${compact(r.date)}`,
    `DTEND;VALUE=DATE:${compact(addDays(r.date, 1))}`,
    `SUMMARY:${icsText(`✦ ${r.title}`)}`,
    `DESCRIPTION:${icsText(details)}`,
    `URL:${link}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
