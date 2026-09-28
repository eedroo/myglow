'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

interface AutocompleteProps<T> {
  id: string;
  label: string;
  fetchOptions: (query: string, signal: AbortSignal) => Promise<T[]>;
  getOptionLabel: (option: T) => string;
  getOptionKey: (option: T) => string | number;
  onSelect: (option: T) => void;
  /** Chamado quando o texto muda (a selecção anterior deixa de ser válida). */
  onInputChange?: (value: string) => void;
  minChars?: number;
  debounceMs?: number;
  placeholder?: string;
  emptyLabel: string;
  loadingLabel: string;
  errorLabel: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
}

/** Combobox ARIA com debounce e navegação por teclado (↑ ↓ Enter Esc). */
export function Autocomplete<T>({
  id,
  label,
  fetchOptions,
  getOptionLabel,
  getOptionKey,
  onSelect,
  onInputChange,
  minChars = 2,
  debounceMs = 300,
  placeholder,
  emptyLabel,
  loadingLabel,
  errorLabel,
  hint,
  error,
  defaultValue = '',
}: AutocompleteProps<T>) {
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [options, setOptions] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const skipNextFetch = useRef(true);
  const fetchRef = useRef(fetchOptions);
  fetchRef.current = fetchOptions;

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < minChars) {
      setOptions([]);
      setStatus('idle');
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');
      setOpen(true);
      try {
        const result = await fetchRef.current(q, controller.signal);
        setOptions(result);
        setActive(result.length ? 0 : -1);
        setStatus('done');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setStatus('error');
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, minChars, debounceMs]);

  function choose(option: T) {
    skipNextFetch.current = true;
    setQuery(getOptionLabel(option));
    setOpen(false);
    setOptions([]);
    setActive(-1);
    onSelect(option);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open && options.length) setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (options.length ? (i - 1 + options.length) % options.length : -1));
    } else if (e.key === 'Enter') {
      const option = options[active];
      if (open && option) {
        e.preventDefault();
        choose(option);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  }

  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const activeId = open && active >= 0 ? `${listId}-opt-${active}` : undefined;

  return (
    <div className="mg-field">
      <label className="mg-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="mg-autocomplete">
        <input
          id={id}
          className={error ? 'mg-input mg-input--error' : 'mg-input'}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onInputChange?.(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onFocus={() => options.length && setOpen(true)}
        />
        {open && (
          <ul id={listId} role="listbox" aria-label={label} className="mg-autocomplete__list">
            {status === 'loading' && (
              <li className="mg-autocomplete__status" role="presentation">
                {loadingLabel}
              </li>
            )}
            {status === 'error' && (
              <li className="mg-autocomplete__status" role="presentation">
                {errorLabel}
              </li>
            )}
            {status === 'done' && options.length === 0 && (
              <li className="mg-autocomplete__status" role="presentation">
                {emptyLabel}
              </li>
            )}
            {status === 'done' &&
              options.map((option, i) => (
                <li
                  key={getOptionKey(option)}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={
                    i === active ? 'mg-autocomplete__option mg-autocomplete__option--active' : 'mg-autocomplete__option'
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(option)}
                >
                  {getOptionLabel(option)}
                </li>
              ))}
          </ul>
        )}
      </div>
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
      <p className="mg-visually-hidden" aria-live="polite">
        {status === 'loading' ? loadingLabel : status === 'done' && options.length === 0 ? emptyLabel : ''}
      </p>
    </div>
  );
}
