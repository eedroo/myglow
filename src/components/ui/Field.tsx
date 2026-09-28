import type { ReactNode } from 'react';

interface FieldProps {
  /** id do controlo; os ids de hint/erro derivam dele (`<id>-hint`, `<id>-error`). */
  id: string;
  label: string;
  hint?: string;
  error?: string;
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

/** Ids para `aria-describedby` do controlo, de acordo com o que o Field vai mostrar. */
export function describedBy(id: string, opts: { hint?: string; error?: string }): string | undefined {
  const ids = [opts.hint && `${id}-hint`, opts.error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

export function Field({ id, label, hint, error, inline, className, children }: FieldProps) {
  return (
    <div className={['mg-field', inline && 'mg-field--inline', className].filter(Boolean).join(' ')}>
      <label className="mg-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mg-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mg-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
