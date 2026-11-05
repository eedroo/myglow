'use client';

import { useState } from 'react';
import { resetOculto } from '@/actions/admin';
import { Button } from '@/components/ui/Button';

/** Admin: recomeçar o Grimório Oculto de uma pessoa do zero. */
export function OcultoResetButton({ userId }: { userId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const run = async () => {
    if (!window.confirm('Recomeçar o Grimório Oculto do zero? As sessões, os sonhos e as avaliações desta pessoa são apagados.')) return;
    setState('busy');
    const r = await resetOculto(userId).catch(() => ({ ok: false as const, error: '' }));
    setState(r.ok ? 'done' : 'error');
  };
  return (
    <div className="mg-admin__actions">
      <Button variant="danger" onClick={() => void run()} disabled={state === 'busy'}>
        Reiniciar o Grimório Oculto
      </Button>
      {state === 'done' && <p className="mg-admin__note">Feito. Volta à semana 1, sessão 1.</p>}
      {state === 'error' && <p className="mg-admin__note">Não foi possível reiniciar.</p>}
    </div>
  );
}
