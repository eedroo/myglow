import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

/** Indexa a página pública e os documentos legais; bloqueia a app e a API (F10). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/privacy', '/terms'],
      disallow: [
        '/api/', '/today', '/day/', '/week', '/month', '/year', '/grimoire', '/profile', '/settings', '/onboarding', '/welcome',
        '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/confirm-email-change', '/goodbye', '/dev/',
      ],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
