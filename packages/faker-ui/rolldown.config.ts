import svelte from 'rollup-plugin-svelte'
import { defineConfig } from 'rolldown'
import postcss from 'rollup-plugin-postcss'
import { visualizer } from 'rollup-plugin-visualizer'
import sveltePreprocess from 'svelte-preprocess'
import path from 'node:path'

const needAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  input: 'src/index.ts',
  treeshake: true,
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, './src/lib'),
    },
    extensions: ['.mjs', '.js', '.ts', '.json', '.svelte'],
    conditionNames: ['svelte', 'import', 'module', 'browser', 'default'],
  },
  output: {
    dir: 'dist',
    entryFileNames: 'index.js',
    format: 'esm',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
      compilerOptions: {
        dev: false,
      },
      extensions: ['.svelte', '.svelte.js', '.svelte.ts'],
      emitCss: true,
      onwarn(warning, handler) {
        if (warning.code === 'state_referenced_locally') return
        handler(warning)
      },
    }),
    postcss({
      extract: 'index.css',
      minimize: true,
    }),
    needAnalyze && visualizer({ open: true }),
  ],
})
