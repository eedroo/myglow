'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { archiveProgram, copyTemplate, createProgram, updateProgram } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

type Kind = 'STRENGTH' | 'STRETCH' | 'MIXED';

interface ProgramFormProps {
  /** Editar um programa existente (senão, "Novo programa"). */
  program?: { id: string; name: string; description: string | null; kind: Kind };
  templates?: { id: string; name: string; description: string }[];
}

/** Novo programa (do zero ou a partir de um modelo) ou edição de um programa. */
export function ProgramForm({ program, templates = [] }: ProgramFormProps) {
  const t = useTranslations('fitness.programs');
  const te = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(program?.name ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [kind, setKind] = useState<Kind>(program?.kind ?? 'STRENGTH');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button className={program ? undefined : 'mg-btn--body'} variant={program ? 'ghost' : 'primary'} onClick={() => setOpen(true)}>
        {program ? t('edit') : t('new')}
      </Button>
    );
  }

  const save = () =>
    start(async () => {
      const input = { name, description, kind };
      if (program) {
        const res = await updateProgram(program.id, input);
        if (!res.ok) return setError(te(res.error));
        setOpen(false);
        return router.refresh();
      }
      const res = await createProgram(input);
      if (!res.ok) return setError(te(res.error));
      router.push(`/body/programs/${res.data.id}`);
    });

  const applyTemplate = (id: string) =>
    start(async () => {
      const res = await copyTemplate(id);
      if (!res.ok) return setError(te(res.error));
      router.push(`/body/programs/${res.data.id}`);
    });

  return (
    <section className="mg-program-form" aria-label={program ? t('edit') : t('new')}>
      <label>
        {t('name')}
        <TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        {t('description')}
        <TextInput value={description} maxLength={280} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        {t('kind')}
        <select className="mg-input" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {(['STRENGTH', 'STRETCH', 'MIXED'] as const).map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <div className="mg-program-form__actions">
        <Button className="mg-btn--body" loading={pending} disabled={!name.trim()} onClick={save}>
          {t('save')}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t('cancel')}
        </Button>
        {program && (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!window.confirm(t('archiveConfirm', { name: program.name }))) return;
                await archiveProgram(program.id);
                router.push('/body');
              })
            }
          >
            {t('archive')}
          </Button>
        )}
      </div>
      {!program && templates.length > 0 && (
        <div className="mg-program-form__templates">
          <h3 className="mg-body-section-title">{t('fromTemplate')}</h3>
          {templates.map((tpl) => (
            <button key={tpl.id} type="button" className="mg-body-welcome__option" disabled={pending} onClick={() => applyTemplate(tpl.id)}>
              <strong>{tpl.name}</strong>
              <span>{tpl.description}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
