import type { MetadataRoute } from 'next';
import { SYSTEM_COLORS } from '@/lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/today',
    name: 'MYGLOW',
    short_name: 'MYGLOW',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: SYSTEM_COLORS.lightBackground,
    theme_color: SYSTEM_COLORS.gold,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
