import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // src/instrumentation.ts valida o env no arranque (Next 14 precisa desta flag).
  experimental: {
    instrumentationHook: true,
    // O Grimório e as Novidades lêem content/ do disco no servidor: incluir os ficheiros no bundle das funções.
    outputFileTracingIncludes: { '/**': ['./content/grimoire/**/*', './content/whats-new.json'] },
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
