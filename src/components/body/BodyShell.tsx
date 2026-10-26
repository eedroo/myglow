import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { BodyNav } from './BodyNav';
import { ActiveSessionPill } from './ActiveSessionPill';

/** Layout do mundo do corpo: conteúdo, pílula da sessão em curso e a navegação própria. */
export async function BodyShell({ children, activeSession }: { children: ReactNode; activeSession: { startedAt: string } | null }) {
  const t = await getTranslations('fitness');
  return (
    <div className="mg-body-shell">
      {children}
      {activeSession && <ActiveSessionPill startedAt={activeSession.startedAt} hideOn="/body/session" />}
      <BodyNav
        label={t('nav.label')}
        items={[
          { href: '/body', label: t('nav.workouts'), match: ['/body', '/body/programs', '/body/workouts'] },
          { href: '/body/exercises', label: t('nav.exercises'), match: ['/body/exercises'] },
          { href: '/body/sessions', label: t('nav.sessions'), match: ['/body/sessions', '/body/session'] },
          { href: '/body/day', label: t('nav.day'), match: ['/body/day'] },
          { href: '/body/corpo', label: t('nav.body'), match: ['/body/corpo', '/body/weight'] },
        ]}
      />
    </div>
  );
}
