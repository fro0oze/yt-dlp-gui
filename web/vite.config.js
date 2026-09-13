import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
  '/ws': {
    target: 'ws://localhost:3000',
    ws: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'YT Downloader',
        short_name: 'YT Downloader',
        description: 'Web-Downloader für YouTube, Instagram, TikTok und mehr',
        lang: 'de',
        id: '/',
        theme_color: '#0d0d0f',
        background_color: '#0d0d0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
  server: { proxy },
  preview: { proxy },
});
