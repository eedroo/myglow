import type { Metadata } from 'next';
import { auth } from '@/auth';
import { getInviter } from '@/lib/friends/queries';
import { isFriendCode, normalizeCode } from '@/lib/friends/rules';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { InviteLanding } from '@/components/friends/InviteLanding';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Convite de amigo por link (público, com ou sem sessão). Código inválido: página genérica. */
export default async function FriendInviteRoute({ params }: { params: { code: string } }) {
  const code = normalizeCode(decodeURIComponent(params.code).slice(0, 20));
  const [session, inviter] = await Promise.all([auth(), isFriendCode(code) ? getInviter(code) : Promise.resolve(null)]);
  return (
    <>
      <AmbientBackground />
      <main id="main">
        <InviteLanding code={code} inviter={inviter} signedIn={!!session?.user?.onboarded} self={!!inviter && session?.user?.id === inviter.id} />
      </main>
    </>
  );
}
