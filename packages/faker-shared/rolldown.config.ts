import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const external = [
  '@faker-js/faker',
  'lodash-es',
  '@baicie/logger',
  /^vite(?:\/|$)/,
  /^node:/,
]

export default defineConfig([
  {
    input: ['./src/index.ts', './src/node.ts'],
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
    input: ['./src/index.ts', './src/node.ts'],
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
    input: ['./src/index.ts', './src/node.ts'],
    output: {
      format: 'cjs',
      dir: './dist',
      entryFileNames: '[name].cjs',
      sourcemap: true,
    },
    treeshake: true,
    external,
    transform: {
      define: {
        'import.meta': '{}',
      },
    },
    watch: {
      clearScreen: false,
    },
  },
])
