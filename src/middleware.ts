import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Ignora assets, PWA e endpoints do Auth.js.
  matcher: [
    '/((?!_next/|icons/|api/auth|manifest.webmanifest|sw.js|favicon.ico|robots.txt).*)',
  ],
};
