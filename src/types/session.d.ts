import type { DefaultSession } from 'next-auth';

type SessionLocale = 'PT_PT' | 'PT_BR' | 'EN';
type SessionTheme = 'LIGHT' | 'DARK' | 'SYSTEM';

declare global {
  interface SessionUser {
    id: string;
    name: string;
    email: string;
    locale: SessionLocale;
    theme: SessionTheme;
    onboarded: boolean;
  }
}

declare module 'next-auth' {
  interface Session {
    user: SessionUser & Omit<DefaultSession['user'], keyof SessionUser>;
  }

  interface User {
    locale?: SessionLocale;
    theme?: SessionTheme;
    onboarded?: boolean;
    sessionVersion?: number;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    name: string;
    email: string;
    locale: SessionLocale;
    theme: SessionTheme;
    onboarded: boolean;
    /** F9: sessionVersion do utilizador quando entrou e última verificação (ms). */
    sv?: number;
    svCheckedAt?: number;
  }
}

export {};
