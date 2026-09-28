import * as Astronomy from 'astronomy-engine';
import { DEG, RAD, normalizeDeg } from './zodiac';

/** Ascendente e meio-do-céu (longitudes eclípticas, graus). Definido também acima de 66° de latitude. */
export function computeAngles(date: Date, latitude: number, longitude: number): { ascendant: number; midheaven: number } {
  const gast = Astronomy.SiderealTime(date); // horas
  const lst = normalizeDeg(gast * 15 + longitude); // graus
  const T = Astronomy.MakeTime(date).tt / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * DEG; // obliquidade média
  const th = lst * DEG;
  const phi = latitude * DEG;
  const ascendant = normalizeDeg(
    Math.atan2(Math.cos(th), -(Math.sin(th) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * RAD,
  );
  const midheaven = normalizeDeg(Math.atan2(Math.sin(th), Math.cos(th) * Math.cos(eps)) * RAD);
  return { ascendant, midheaven };
}
