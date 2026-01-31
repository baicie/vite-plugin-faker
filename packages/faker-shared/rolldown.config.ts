import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

export default defineConfig([
  {
    input: ['./src/index.ts', './src/node.ts'],
    output: {
      format: 'esm',
      dir: './dist',
    },
    treeshake: true,
    plugins: [dts({ emitDtsOnly: true })],
    watch: {
      clearScreen: false,
    },
  },
  {
    input: ['./src/index.ts', './src/node.ts'],
    output: [
      {
        format: 'esm',
        dir: './dist',
        entryFileNames: '[name].js',
        sourcemap: true,
      },
      {
        format: 'cjs',
        dir: './dist',
        entryFileNames: '[name].cjs',
        sourcemap: true,
      },
    ],
    treeshake: true,
    external: ['@faker-js/faker', 'lodash-es'],
    watch: {
      clearScreen: false,
    },
  },
])
