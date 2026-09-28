import { describe, expect, it } from 'vitest';
import { birthProfileSchema } from './onboarding';

const base = {
  birthDate: '1990-07-15',
  birthTimeKnown: true,
  birthTime: '14:30',
  placeName: 'Lisboa, Lisboa, Portugal',
  latitude: 38.72,
  longitude: -9.14,
  timezone: 'Europe/Lisbon',
  userTimezone: 'Europe/Lisbon',
};

describe('birthProfileSchema', () => {
  it('aceita um perfil completo', () => {
    expect(birthProfileSchema.safeParse(base).success).toBe(true);
  });

  it('falha com birthTimeKnown: true e birthTime: null', () => {
    const r = birthProfileSchema.safeParse({ ...base, birthTimeKnown: true, birthTime: null });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['birthTime']);
  });

  it('passa com birthTimeKnown: false e birthTime: null', () => {
    expect(birthProfileSchema.safeParse({ ...base, birthTimeKnown: false, birthTime: null }).success).toBe(true);
  });

  it('rejeita data futura', () => {
    const r = birthProfileSchema.safeParse({ ...base, birthDate: '2999-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['birthDate']);
  });

  it('rejeita hora mal formada', () => {
    expect(birthProfileSchema.safeParse({ ...base, birthTime: '24:00' }).success).toBe(false);
  });

  it('rejeita coordenadas fora de alcance', () => {
    expect(birthProfileSchema.safeParse({ ...base, latitude: 91 }).success).toBe(false);
    expect(birthProfileSchema.safeParse({ ...base, longitude: -181 }).success).toBe(false);
  });
});
