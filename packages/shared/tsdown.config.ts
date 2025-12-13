import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['./src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    treeshake: true,
  },
  {
    entry: ['./src/node.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    treeshake: true,
  },
])
