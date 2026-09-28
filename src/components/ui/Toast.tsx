'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  variant: 'success' | 'error';
  message: string;
  closeLabel: string;
  onClose?: () => void;
  /** Fecha sozinho após N ms (0 = nunca). */
  duration?: number;
  /** Mostra no fluxo em vez de fixo no ecrã (showcase). */
  inline?: boolean;
}

export function Toast({ variant, message, closeLabel, onClose, duration = 5000, inline }: ToastProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closable = !!onClose;

  useEffect(() => {
    if (!closable || !duration) return;
    const t = setTimeout(() => onCloseRef.current?.(), duration);
    return () => clearTimeout(t);
  }, [closable, duration, message]);

  return (
    <div
      className={['mg-toast', `mg-toast--${variant}`, inline && 'mg-toast--inline'].filter(Boolean).join(' ')}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <p className="mg-toast__message">{message}</p>
      {onClose && (
        <button type="button" className="mg-toast__close" onClick={onClose} aria-label={closeLabel}>
          <X size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
