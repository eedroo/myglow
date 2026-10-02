import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Ignora assets, PWA, endpoints do Auth.js e o do Inngest (autenticado pela assinatura INNGEST_SIGNING_KEY);
  // F10: robots, sitemap e imagem de partilha são públicos (`/` é público em auth.config).
  matcher: [
    '/((?!_next/|icons/|api/auth|api/inngest|manifest.webmanifest|sw.js|favicon.ico|robots.txt|sitemap.xml|opengraph-image).*)',
  ],
};
