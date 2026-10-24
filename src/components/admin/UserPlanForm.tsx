'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setUserPlan } from '@/actions/admin';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface UserPlanFormProps {
  userId: string;
  plan: 'FREE' | 'PREMIUM';
  source: 'MANUAL' | 'GIFT';
  expiresAt: string | null; // YYYY-MM-DD
}

/** Mudar o plano de uma pessoa (sem pagamentos: origem manual ou oferta, com data de fim opcional). */
export function UserPlanForm({ userId, plan: initialPlan, source: initialSource, expiresAt: initialExpires }: UserPlanFormProps) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [source, setSource] = useState(initialSource);
  const [expires, setExpires] = useState(initialExpires ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mg-admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await setUserPlan(userId, plan, source, plan === 'PREMIUM' && expires ? expires : null);
          setMessage(res.ok ? 'Guardado.' : res.error);
          if (res.ok) router.refresh();
        });
      }}
    >
      <SegmentedControl
        name="plan"
        legend="Plano"
        value={plan}
        onChange={setPlan}
        options={[
          { value: 'FREE', label: 'Grátis' },
          { value: 'PREMIUM', label: 'Premium' },
        ]}
      />
      {plan === 'PREMIUM' && (
        <>
          <SegmentedControl
            name="source"
            legend="Origem"
            value={source}
            onChange={setSource}
            options={[
              { value: 'MANUAL', label: 'Manual' },
              { value: 'GIFT', label: 'Oferta' },
            ]}
          />
          <label className="mg-admin-form__field">
            <span>Fim (opcional)</span>
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </label>
        </>
      )}
      <div className="mg-admin-form__actions">
        <Button type="submit" loading={pending}>
          Guardar plano
        </Button>
        {message && (
          <span className="mg-admin-form__status" role="status">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
