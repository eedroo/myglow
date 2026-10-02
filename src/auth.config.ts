import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Config edge-safe (sem Prisma nem bcrypt) — usada pelo middleware.
 * `src/auth.ts` acrescenta o provider Credentials e o refresh do token a partir da DB.
 */

const AUTH_PAGES = ['/login', '/register'];
const PUBLIC_PREFIXES = ['/dev', '/api/test/'];
/** F9: páginas abertas com ou sem sessão (links dos emails e documentos legais). */
const PUBLIC_PAGES = ['/forgot-password', '/reset-password', '/verify-email', '/confirm-email-change', '/privacy', '/terms', '/goodbye'];

export const authConfig = {
  trustHost: true,
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname, searchParams } = request.nextUrl;
      const user = auth?.user;
      const isAuthPage = AUTH_PAGES.includes(pathname);
      const isOnboarding = pathname === '/onboarding';
      const isApi = pathname.startsWith('/api/');

      if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || PUBLIC_PAGES.includes(pathname)) return true;

      if (!user) {
        if (isAuthPage) return true;
        if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        return false; // → /login
      }

      if (!user.onboarded) {
        if (isOnboarding || isApi) return true;
        return NextResponse.redirect(new URL('/onboarding', request.nextUrl));
      }

      const editingBirth = isOnboarding && searchParams.get('edit') === '1';
      if (isAuthPage || (isOnboarding && !editingBirth)) {
        return NextResponse.redirect(new URL('/today', request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.name = user.name ?? '';
        token.email = user.email ?? '';
        token.locale = user.locale ?? 'PT_PT';
        token.theme = user.theme ?? 'LIGHT';
        token.onboarded = user.onboarded ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        name: token.name,
        email: token.email,
        locale: token.locale,
        theme: token.theme,
        onboarded: token.onboarded,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
