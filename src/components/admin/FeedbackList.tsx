import type { FeedbackKind } from '@prisma/client';

export interface AdminFeedbackItem {
  id: string;
  kind: FeedbackKind;
  message: string;
  path: string | null;
  createdAt: Date;
  email: string | null;
}

const KIND: Record<FeedbackKind, string> = { BUG: 'Erro', IDEA: 'Ideia', PRAISE: 'Elogio', OTHER: 'Outro' };

/** Feedback enviado pelas pessoas (mais recente primeiro), com email para responder. */
export function FeedbackList({ items }: { items: AdminFeedbackItem[] }) {
  if (!items.length) return <p>Sem feedback.</p>;
  return (
    <ul className="mg-admin-feedback">
      {items.map((f) => (
        <li key={f.id} className="mg-admin-feedback__item">
          <p className="mg-admin-feedback__meta">
            <strong>{KIND[f.kind]}</strong> · {f.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC
            {f.path && <> · {f.path}</>}
            {' · '}
            {f.email ? <a href={`mailto:${f.email}`}>{f.email}</a> : 'conta apagada'}
          </p>
          <p className="mg-admin-feedback__message">{f.message}</p>
        </li>
      ))}
    </ul>
  );
}
