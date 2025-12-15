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
      },
      {
        format: 'cjs',
        dir: './dist',
        entryFileNames: '[name].cjs',
      },
    ],
    treeshake: true,
    watch: {
      clearScreen: false,
    },
  },
])
