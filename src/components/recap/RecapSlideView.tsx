'use client';

import { useTranslations } from 'next-intl';
import type { AppLocale } from '@/i18n/locales';
import type { RecapSlide } from '@/lib/recap/build';
import type { RecapKindKey } from '@/lib/recap/period';
import { RecapCover } from './RecapCover';
import { RecapDays } from './RecapDays';
import { RecapGlow } from './RecapGlow';
import { RecapRituals } from './RecapRituals';
import { RecapBody } from './RecapBody';
import { RecapRest } from './RecapRest';
import { RecapGrimoire } from './RecapGrimoire';
import { RecapSky } from './RecapSky';
import { RecapHighlight } from './RecapHighlight';
import { RecapClosing } from './RecapClosing';

export interface RecapSlideProps<T extends RecapSlide['type']> {
  slide: Extract<RecapSlide, { type: T }>;
  kind: RecapKindKey;
  locale: AppLocale;
  timezone: string;
  /** Slide pré-carregado (escondido): sem animações. */
  preload?: boolean;
}

interface RecapSlideViewProps {
  slide: RecapSlide;
  kind: RecapKindKey;
  periodKey: string;
  index: number;
  total: number;
  locale: AppLocale;
  timezone: string;
  onClose: () => void;
  guideInterested: boolean;
  preload?: boolean;
}

function SlideBody({ slide, kind, periodKey, locale, timezone, onClose, guideInterested, preload }: Omit<RecapSlideViewProps, 'index' | 'total'>) {
  const common = { kind, locale, timezone, preload };
  switch (slide.type) {
    case 'cover': return <RecapCover slide={slide} {...common} />;
    case 'days': return <RecapDays slide={slide} {...common} />;
    case 'glow': return <RecapGlow slide={slide} {...common} />;
    case 'rituals': return <RecapRituals slide={slide} {...common} />;
    case 'body': return <RecapBody slide={slide} {...common} />;
    case 'rest': return <RecapRest slide={slide} {...common} />;
    case 'grimoire': return <RecapGrimoire slide={slide} {...common} />;
    case 'sky': return <RecapSky slide={slide} {...common} />;
    case 'highlight': return <RecapHighlight slide={slide} {...common} />;
    case 'closing':
      return (
        <RecapClosing
          slide={slide}
          {...common}
          onClose={onClose}
          guideInterested={guideInterested}
          periodHref={kind === 'WEEK' ? `/week/${periodKey}` : `/month/${periodKey}`}
          guideHref={`/guide/${kind === 'WEEK' ? 'week' : 'month'}/${periodKey}`}
        />
      );
  }
}

/** Um slide: região anunciada com fundo próprio (rodízio de 4 gradientes). */
export function RecapSlideView({ index, total, ...rest }: RecapSlideViewProps) {
  const t = useTranslations('recap');
  const bg = (index % 4) + 1;
  return (
    <section
      className={`mg-recap-slide mg-recap-slide--${rest.slide.type} mg-recap-slide--bg-${bg}`}
      aria-roledescription={t('slide')}
      aria-label={t('progress', { n: index + 1, total })}
      aria-live={rest.preload ? undefined : 'polite'}
    >
      <div className="mg-recap-slide__inner">
        <SlideBody {...rest} />
      </div>
    </section>
  );
}
