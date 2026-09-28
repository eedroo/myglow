import * as Astronomy from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { computeAngles } from './angles';
import { signedDeg } from './zodiac';

const LAT = 38.72;
const LON = -9.14;
const observer = new Astronomy.Observer(LAT, LON, 0);
const DATES = ['2026-01-10', '2026-06-21', '1990-07-15'];

describe.each(DATES)('computeAngles em Lisboa, %s', (date) => {
  const start = new Date(`${date}T00:00:00Z`);

  it('ao nascer do sol, o ascendente está a < 2° do Sol', () => {
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, start, 1)!;
    const sun = Astronomy.SunPosition(rise.date).elon;
    const { ascendant } = computeAngles(rise.date, LAT, LON);
    expect(Math.abs(signedDeg(ascendant - sun))).toBeLessThan(2);
  });

  it('no trânsito solar, o meio-do-céu está a < 0.5° do Sol', () => {
    const transit = Astronomy.SearchHourAngle(Astronomy.Body.Sun, observer, 0, start).time;
    const sun = Astronomy.SunPosition(transit.date).elon;
    const { midheaven } = computeAngles(transit.date, LAT, LON);
    expect(Math.abs(signedDeg(midheaven - sun))).toBeLessThan(0.5);
  });
});

describe('latitudes altas', () => {
  it('acima de 66° o ascendente continua definido', () => {
    const { ascendant, midheaven } = computeAngles(new Date('2026-06-21T12:00:00Z'), 69.65, 18.96);
    expect(Number.isFinite(ascendant)).toBe(true);
    expect(Number.isFinite(midheaven)).toBe(true);
  });
});
