import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'packages/faker-shared/__tests__/**/*.test.ts',
            'packages/faker-core/__tests__/**/*.test.ts',
            'packages/vite-plugin-faker/__tests__/**/*.test.ts',
          ],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
      {
        test: {
          name: 'unit-jsdom',
          environment: 'jsdom',
          include: ['packages/faker-interceptor/__tests__/**/*.test.ts'],
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
