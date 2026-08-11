import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const external = ['@faker-js/faker', 'lodash-es', /^node:/]

export default defineConfig([
  {
    input: ['./src/index.ts', './src/browser.ts', './src/node.ts'],
    output: {
      format: 'esm',
      dir: './dist',
    },
    treeshake: true,
    external,
    plugins: [dts({ emitDtsOnly: true })],
    watch: {
      clearScreen: false,
    },
  },
  {
    input: ['./src/index.ts', './src/browser.ts', './src/node.ts'],
    transform: {
      target: 'es2015',
    },
    output: {
      format: 'esm',
      dir: './dist',
      entryFileNames: '[name].js',
      sourcemap: true,
    },
    treeshake: true,
    external,
    watch: {
      clearScreen: false,
    },
  },
  {
    input: ['./src/index.ts', './src/browser.ts', './src/node.ts'],
    output: {
      format: 'cjs',
      dir: './dist',
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
      sourcemap: true,
    },
    treeshake: true,
    external,
    transform: {
      target: 'es2015',
      define: {
        'import.meta': '{}',
      },
    },
    watch: {
      clearScreen: false,
    },
  },
])
