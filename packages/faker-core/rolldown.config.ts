import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import fs from 'node:fs'
import { builtinModules } from 'node:module'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  // Node.js 内置模块
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
]

export default defineConfig([
  {
    input: ['./src/index.ts'],
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
    input: ['./src/index.ts'],
    output: [
      {
        format: 'esm',
        dir: './dist',
        entryFileNames: '[name].js',
      },
    ],
    treeshake: true,
    external,
    watch: {
      clearScreen: false,
    },
  },
])
