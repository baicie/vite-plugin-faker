import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@baicie\/faker-shared$/,
        replacement: fileURLToPath(
          new URL('./packages/faker-shared/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@baicie\/faker-shared\/node$/,
        replacement: fileURLToPath(
          new URL('./packages/faker-shared/src/node.ts', import.meta.url),
        ),
      },
      {
        find: /^@baicie\/faker-core$/,
        replacement: fileURLToPath(
          new URL('./packages/faker-core/src/index.ts', import.meta.url),
        ),
      },
    ],
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'scripts/__tests__/**/*.test.js',
            'packages/faker-shared/__tests__/**/*.test.ts',
            'packages/faker-core/__tests__/**/*.test.ts',
            'packages/vite-plugin-faker/__tests__/**/*.test.ts',
            'packages/webpack-plugin-faker/__tests__/**/*.test.ts',
          ],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
      {
        plugins: [vueJsx()],
        test: {
          name: 'unit-jsdom',
          environment: 'jsdom',
          include: [
            'packages/faker-interceptor/__tests__/**/*.test.ts',
            'packages/faker-ui/__tests__/**/*.test.ts',
          ],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/faker-shared/src/**',
        'packages/faker-core/src/**',
        'packages/faker-interceptor/src/**',
        'packages/vite-plugin-faker/src/**',
      ],
      exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/**'],
    },
  },
})
