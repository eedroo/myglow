'use client';

import { useState } from 'react';
import { publishAnnouncement } from '@/actions/announcements';
import { Button } from '@/components/ui/Button';

/** F19 (admin): "Publicar anúncio v2": slides de novidades, caixa e push a todos os utilizadores existentes. */
export function AnnouncementsCard({ publishedAt }: { publishedAt: string | null }) {
  const [state, setState] = useState<{ status: 'idle' | 'busy' } | { status: 'done'; queued: boolean } | { status: 'error'; error: string }>({ status: 'idle' });
  const publish = async () => {
    if (!window.confirm('Publicar o anúncio v2? Todos os utilizadores existentes recebem um aviso (caixa e push).')) return;
    setState({ status: 'busy' });
    const r = await publishAnnouncement('v2').catch(() => ({ ok: false as const, error: 'Falha de rede.' }));
    setState(r.ok ? { status: 'done', queued: r.queued } : { status: 'error', error: r.error });
  };
  return (
    <div className="mg-admin__actions">
      <p className="mg-admin__note">
        {publishedAt ? `v2 publicado em ${publishedAt}. Publicar de novo não repete avisos já enviados.` : 'v2 por publicar.'}
      </p>
      <Button onClick={() => void publish()} disabled={state.status === 'busy'}>
        Publicar anúncio v2
      </Button>
      {state.status === 'done' && (
        <p className="mg-admin__note">{state.queued ? 'Publicado. O envio corre em lotes no Inngest.' : 'Publicado, mas o envio não foi para o Inngest (sem chave?).'}</p>
      )}
      {state.status === 'error' && <p className="mg-admin__note">{state.error}</p>}
    </div>
  );
}
