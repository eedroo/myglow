import { auth } from '@/auth';
import { db } from '@/lib/db';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { PremiumLock } from '@/components/premium/PremiumLock';

/** Pré-visualização dos componentes premium nos dois temas (ainda não aparecem na app). */
export default async function AdminPreviewPage() {
  const session = await auth();
  const me = await db.user.findUnique({ where: { id: session!.user.id }, select: { premiumInterestAt: true } });
  const panes = [
    { theme: 'light', label: 'Claro' },
    { theme: 'dark', label: 'Escuro' },
  ];
  return (
    <>
      <h1 className="mg-admin__title">Pré-visualização</h1>
      <p className="mg-admin__note">
        O botão grava o interesse da tua própria conta (uma vez) e conta em &quot;Interessados no premium&quot;.
      </p>
      <GlassCard>
        <div className="mg-admin-preview">
          {panes.map((p) => (
            <div key={p.theme} data-theme={p.theme} className="mg-admin-preview__pane">
              <p className="mg-admin__note">{p.label}</p>
              <p>
                Nível 3 <PremiumBadge />
              </p>
              <PremiumLock
                title="O teu guia pessoal"
                teaser="Uma camada a mais para o teu caminho. Está quase pronta."
                interested={!!me?.premiumInterestAt}
              />
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
