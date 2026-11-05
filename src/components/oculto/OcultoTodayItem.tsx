import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { getOculto } from '@/lib/oculto/server';

/** Dentro da Manhã do Hoje, só com o recurso e com sessão por fazer hoje. */
export async function OcultoTodayItem({ userId }: { userId: string }) {
  const state = await getOculto(userId).catch(() => null);
  if (!state?.content || !state.status.canPractice || state.currentReview?.result === 'ADVANCE') return null;
  const next = state.content.sessions.find((s) => s.day === state.status.next);
  if (!next) return null;
  const t = await getTranslations('oculto');
  return (
    <Link href="/oculto/sessao" className="mg-oculto-today">
      <MagicIcon name="constellation" size="sm" decorative />
      <span className="mg-oculto-today__text">
        <span className="mg-oculto-today__title">{t('todayTitle')}</span>
        <span className="mg-oculto-today__hint">{t('todayHint', { day: next.day, minutes: next.mainMinutes, title: next.title })}</span>
      </span>
    </Link>
  );
}
