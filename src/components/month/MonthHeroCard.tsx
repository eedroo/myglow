import type { ZodiacSign } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MOON_PHASE_ICON } from '@/components/ui/MoonPhaseStrip';
import type { DateISO } from '@/lib/dates';
import type { DailyMoon } from '@/types/astro';

interface MonthHeroCardProps {
  title: string; // "Maio de 2026"
  sunSigns: { sign: ZodiacSign; from: DateISO }[];
  /** Lua de hoje, só no mês actual. */
  moonToday: DailyMoon | null;
}

/** Cabeçalho do mês: nome em Cormorant, signos do Sol e lua de hoje. */
export async function MonthHeroCard({ title, sunSigns, moonToday }: MonthHeroCardProps) {
  const [t, ta] = await Promise.all([getTranslations('month.hero'), getTranslations('astro')]);
  const [first, second] = sunSigns;

  return (
    <section className="mg-hero" aria-label={title}>
      <p className="mg-hero__title">{title}</p>
      {first && (
        <p className="mg-hero__sub">
          <MagicIcon name="sun" size="sm" decorative />
          {second
            ? t('sunChange', {
                from: ta(`signs.${first.sign}`),
                to: ta(`signs.${second.sign}`),
                day: Number(second.from.slice(8)),
              })
            : t('sun', { sign: ta(`signs.${first.sign}`) })}
        </p>
      )}
      {moonToday && (
        <p className="mg-hero__moon">
          <MagicIcon name={MOON_PHASE_ICON[moonToday.phase]} size="sm" decorative />
          {t('moonToday', { phase: ta(`phases.${moonToday.phase}`), sign: ta(`signs.${moonToday.signAtNoon}`) })}
        </p>
      )}
    </section>
  );
}
