import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchPlaces } from './geocode';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(body: unknown, ok = true) {
  const fn = vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('searchPlaces', () => {
  it('chama a Open-Meteo com name, count=8, language e format=json', async () => {
    const fetchMock = stubFetch({ results: [] });
    await searchPlaces('Lisboa', 'pt');
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({ name: 'Lisboa', count: '8', language: 'pt', format: 'json' });
  });

  it('mapeia admin1 + country para o label e ignora resultados sem fuso', async () => {
    stubFetch({
      results: [
        { id: 1, name: 'Lisboa', admin1: 'Lisboa', country: 'Portugal', country_code: 'PT', latitude: 38.7, longitude: -9.1, timezone: 'Europe/Lisbon' },
        { id: 2, name: 'Sem fuso', latitude: 0, longitude: 0 },
        { id: 3, name: 'Mónaco', country: 'Mónaco', country_code: 'MC', latitude: 43.7, longitude: 7.4, timezone: 'Europe/Monaco' },
      ],
    });
    expect(await searchPlaces('x', 'pt')).toEqual([
      { id: 1, name: 'Lisboa', label: 'Lisboa, Lisboa, Portugal', latitude: 38.7, longitude: -9.1, timezone: 'Europe/Lisbon', countryCode: 'PT' },
      { id: 3, name: 'Mónaco', label: 'Mónaco, Mónaco', latitude: 43.7, longitude: 7.4, timezone: 'Europe/Monaco', countryCode: 'MC' },
    ]);
  });

  it('devolve lista vazia quando a API não tem resultados', async () => {
    stubFetch({});
    expect(await searchPlaces('zzz', 'en')).toEqual([]);
  });

  it('lança erro quando a API falha', async () => {
    stubFetch({}, false);
    await expect(searchPlaces('Lisboa', 'pt')).rejects.toThrow();
  });
});
