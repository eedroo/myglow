'use client';

import { Button } from '@/components/ui/Button';

/** Rodapé dos slides com campos (F18): Voltar · Saltar · Continuar; fica acima do teclado no telemóvel. */
export function SlideFooter({
  onBack,
  onSkip,
  onContinue,
  canBack,
  canContinue,
  busy,
  labels,
}: {
  onBack: () => void;
  onSkip?: () => void;
  onContinue: () => void;
  canBack: boolean;
  canContinue: boolean;
  busy?: boolean;
  labels: { back: string; skip: string; continue: string };
}) {
  return (
    <div className="mg-slides__footer">
      <Button variant="ghost" onClick={onBack} disabled={!canBack || busy}>
        {labels.back}
      </Button>
      <span className="mg-slides__footer-end">
        {onSkip && (
          <Button variant="subtle" onClick={onSkip} disabled={busy}>
            {labels.skip}
          </Button>
        )}
        <Button onClick={onContinue} disabled={!canContinue} loading={busy}>
          {labels.continue}
        </Button>
      </span>
    </div>
  );
}
