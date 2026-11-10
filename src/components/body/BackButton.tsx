'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * Voltar à página de onde se veio (sessão, treino, mapa muscular, biblioteca…). Sem histórico dentro da app (link
 * aberto de fora), vai para `fallback`.
 */
export function BackButton({ fallback, label, className }: { fallback: string; label: string; className?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      className={className}
      onClick={(e) => {
        const fromApp = typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin) && window.history.length > 1;
        if (!fromApp) return;
        e.preventDefault();
        router.back();
      }}
    >
      <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
      {label}
    </Link>
  );
}
