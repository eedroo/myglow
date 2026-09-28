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
  }
}

export {};
