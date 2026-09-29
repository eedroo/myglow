import type { Hemisphere } from '@prisma/client';

/**
 * Hemisfério a partir do fuso IANA (usado para os nomes dos sabbats).
 * Lista explícita do Sul; tudo o resto é Norte. O utilizador pode corrigir nas definições.
 */
const SOUTH_EXACT = new Set([
  // Brasil (excepto America/Boa_Vista, a norte do equador)
  'America/Sao_Paulo', 'America/Rio_Branco', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande',
  'America/Porto_Velho', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Maceio',
  'America/Bahia', 'America/Araguaina', 'America/Santarem', 'America/Noronha', 'America/Eirunepe',
  // Resto da América do Sul
  'America/Santiago', 'America/Punta_Arenas', 'America/Montevideo', 'America/Asuncion', 'America/La_Paz',
  'America/Lima',
  // África
  'Africa/Johannesburg', 'Africa/Maputo', 'Africa/Harare', 'Africa/Lusaka', 'Africa/Windhoek',
  'Africa/Gaborone', 'Africa/Maseru', 'Africa/Mbabane', 'Africa/Luanda', 'Africa/Lubumbashi',
  'Africa/Blantyre', 'Africa/Dar_es_Salaam',
  // Índico
  'Indian/Antananarivo', 'Indian/Mauritius', 'Indian/Reunion',
  // Ásia / Oceânia
  'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura',
  'Pacific/Auckland', 'Pacific/Chatham', 'Pacific/Fiji', 'Pacific/Tongatapu', 'Pacific/Noumea', 'Pacific/Tahiti',
]);

const SOUTH_PREFIXES = ['America/Argentina/', 'Australia/', 'Antarctica/'];

export function guessHemisphere(tz: string): Hemisphere {
  if (SOUTH_EXACT.has(tz) || SOUTH_PREFIXES.some((p) => tz.startsWith(p))) return 'SOUTH';
  return 'NORTH';
}
