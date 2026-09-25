/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { copyFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

// GitHub Pages serves the app from /<repo>/; dev always runs at /.
const PAGES_BASE = '/my-subscriptions/'

// GitHub Pages serves 404.html for unknown paths — make it the SPA so deep links work.
const spaFallback = (): Plugin => {
  let outDir = 'dist'
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved: (config) => {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle: () => copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '404.html')),
  }
}

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' ? PAGES_BASE : '/'),
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg', 'icons/favicon-32.png'],
      manifest: {
        name: 'My Subscriptions',
        short_name: 'Subscriptions',
        display: 'standalone',
        // Static Nocturne dark values; the active scheme is applied at runtime via <meta name="theme-color">.
        theme_color: '#141520',
        background_color: '#141520',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Google API calls are never cached: offline must look offline, and the outbox retries them.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      thresholds: {
        'src/domain/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
      },
    },
  },
}))
