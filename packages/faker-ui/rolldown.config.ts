import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import pkg from './package.json' with { type: 'json' }

const external = Object.keys(pkg.dependencies || {})

export default defineConfig({
  input: 'src/index.ts',
  external,
  output: {
    format: 'esm',
    dir: 'dist',
  },
  plugins: [dts({ emitDtsOnly: true })],
})
