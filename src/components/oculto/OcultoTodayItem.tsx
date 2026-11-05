import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { getOculto } from '@/lib/oculto/server';
import { OcultoDreamCard } from './OcultoDreamCard';

/** Dentro da Manhã do Hoje, só com o recurso: a sessão por fazer hoje e, na semana dos sonhos, o sonho desta noite. */
export async function OcultoTodayItem({ userId }: { userId: string }) {
  const state = await getOculto(userId).catch(() => null);
  if (!state?.content) return null;
  // Semana dos sonhos: o campo do sonho fica na Manhã todos os dias, com ou sem sessão por fazer.
  const dream = state.content.dreamJournal ? <OcultoDreamCard initial={state.todayDream} /> : null;
  const practice = state.status.canPractice && state.currentReview?.result !== 'ADVANCE';
  const next = practice ? state.content.sessions.find((s) => s.day === state.status.next) : undefined;
  if (!next) return dream;
  const t = await getTranslations('oculto');
  return (
    <>
      {dream}
      <Link href="/oculto/sessao" className="mg-oculto-today">
        <MagicIcon name="constellation" size="sm" decorative />
        <span className="mg-oculto-today__text">
          <span className="mg-oculto-today__title">{t('todayTitle')}</span>
          <span className="mg-oculto-today__hint">{t('todayHint', { day: next.day, minutes: next.mainMinutes, title: next.title })}</span>
        </span>
      </Link>
    </>
  );
}
