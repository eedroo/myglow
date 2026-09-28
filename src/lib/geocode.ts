export interface PlaceResult {
  id: number;
  name: string; // "Lisboa"
  label: string; // "Lisboa, Lisboa, Portugal"
  latitude: number;
  longitude: number;
  timezone: string; // IANA
  countryCode: string;
}

interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
}

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

/** Pesquisa locais na Open-Meteo Geocoding API (sem chave). Ignora resultados sem fuso. */
export async function searchPlaces(query: string, locale: 'pt' | 'en'): Promise<PlaceResult[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('name', query);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', locale);
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = (await res.json()) as { results?: OpenMeteoResult[] };

  return (data.results ?? [])
    .filter((r): r is OpenMeteoResult & { timezone: string } => typeof r.timezone === 'string')
    .map((r) => ({
      id: r.id,
      name: r.name,
      label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
      countryCode: r.country_code ?? '',
    }));
}
