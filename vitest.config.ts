import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const workspaceAliases = [
  {
    find: /^@baicie\/faker-shared$/,
    replacement: fileURLToPath(
      new URL('./packages/faker-shared/src/index.ts', import.meta.url),
    ),
  },
  {
    find: /^@baicie\/faker-shared\/browser$/,
    replacement: fileURLToPath(
      new URL('./packages/faker-shared/src/browser.ts', import.meta.url),
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
]

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@zeus-js/zeus',
  },
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    projects: [
      {
        resolve: {
          alias: workspaceAliases,
        },
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
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: '@zeus-js/zeus',
        },
        resolve: {
          alias: workspaceAliases,
        },
        test: {
          name: 'unit-jsdom',
          environment: 'jsdom',
          server: {
            deps: {
              inline: [/@zeus-js\//, /@zeus-web\//],
            },
          },
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
