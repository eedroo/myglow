'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { track } from '@vercel/analytics';

/** "Criar conta" da landing: conta o clique (`register_click`, sem propriedades). */
export function RegisterCta({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link href="/register" className={className} onClick={() => track('register_click')}>
      {children}
    </Link>
  );
}
