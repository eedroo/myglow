/**
 * Limpeza dos eventos antes de irem para o Sentry (F12): nunca email, nome, cookies, corpo de pedidos nem texto
 * do utilizador; do utilizador fica só o `id` interno. Pura e estrutural (não depende do SDK).
 */
const DIARY_KEYS = new Set(['intention', 'reflection', 'gratitude', 'summary', 'note', 'text', 'message']);
const SECRET_HEADERS = new Set(['cookie', 'authorization', 'set-cookie']);

interface ScrubbableEvent {
  request?: {
    data?: unknown;
    cookies?: unknown;
    headers?: Record<string, string>;
    query_string?: unknown;
    url?: string;
  };
  user?: Record<string, unknown> & { id?: string | number };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
}

const hasToken = (v: unknown) => typeof v === 'string' ? /token/i.test(v) : JSON.stringify(v ?? '').toLowerCase().includes('token');

/** Remove, a qualquer profundidade, as chaves com texto do diário. */
function dropDiaryKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropDiaryKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !DIARY_KEYS.has(k.toLowerCase()))
        .map(([k, v]) => [k, dropDiaryKeys(v)]),
    );
  }
  return value;
}

export function scrubEvent<T extends object>(input: T): T {
  const event = input as T & ScrubbableEvent;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([k]) => !SECRET_HEADERS.has(k.toLowerCase())),
      );
    }
    if (event.request.query_string !== undefined && hasToken(event.request.query_string)) delete event.request.query_string;
    if (event.request.url && /[?&][^=]*token/i.test(event.request.url)) event.request.url = event.request.url.split('?')[0];
  }
  if (event.user) event.user = event.user.id !== undefined ? { id: event.user.id } : {};
  if (event.extra) event.extra = dropDiaryKeys(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = dropDiaryKeys(event.contexts) as Record<string, unknown>;
  return event;
}
