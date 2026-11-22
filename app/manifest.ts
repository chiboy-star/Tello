import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tallo',
    short_name: 'Tallo',
    description: 'Lightweight sales, stock and credit tracker for shop owners',
    start_url: '/home',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F6F2',
    theme_color: '#0E7C57',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
