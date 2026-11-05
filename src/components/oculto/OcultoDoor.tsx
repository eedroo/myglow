import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { hasOculto } from '@/lib/oculto/server';

/** No fim do Grimório, só para quem tem o recurso: a porta para o Grimório Oculto. */
export async function OcultoDoor({ userId }: { userId: string }) {
  if (!(await hasOculto(userId))) return null;
  const t = await getTranslations('oculto');
  return (
    <Link href="/oculto" className="mg-oculto-door">
      <MagicIcon name="constellation" size="md" decorative />
      <span className="mg-oculto-door__text">
        <span className="mg-oculto-door__title">{t('doorTitle')}</span>
        <span className="mg-oculto-door__hint">{t('doorHint')}</span>
      </span>
    </Link>
  );
}
