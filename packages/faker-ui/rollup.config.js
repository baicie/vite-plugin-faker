// @ts-check
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fse from 'fs-extra'
import { findWorkspacePackages } from '@pnpm/find-workspace-packages'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'
import prefixer from 'postcss-prefix-selector'
import { defineConfig } from 'rollup'
import replace from '@rollup/plugin-replace'
import esbuild from 'rollup-plugin-esbuild'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json' with { type: 'json' }

// 定义根路径
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '../..')
const fakerUiPath = path.resolve(__dirname, 'dist')

// 构建结束后执行的函数
const copyDistFiles = async () => {
  const workspacePackages = await findWorkspacePackages(rootPath)
  const vitePluginFaker = workspacePackages.find(
    pkg => pkg.manifest.name === 'vite-plugin-faker',
  )
  if (!vitePluginFaker) {
    throw new Error('vite-plugin-faker not found')
  }
  const targetPath = path.resolve(vitePluginFaker.dir, 'dist')
  // copy faker-ui.js to vite-plugin-faker/dist/faker-ui.js
  fse.ensureDirSync(targetPath)
  fse.copySync(fakerUiPath, targetPath, { overwrite: true })
}

export default defineConfig({
  input: 'src/main.ts',
  treeshake: true,
  output: {
    file: 'dist/faker-ui.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    nodeResolve({
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    }),
    vue(),
    vueJsx(),
    esbuild({
      tsconfig: './tsconfig.json',
    }),
    commonjs(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'production',
      ),
    }),
    postcss({
      extract: 'faker-ui.css',
      minimize: true,
      plugins: [
        autoprefixer(),
        prefixer({
          prefix: `.${pkg.name}`,
          transform(prefix, selector, prefixedSelector, filePath, rule) {
            if (/^(?:html|body)/.test(selector)) {
              return selector.replace(/^(\S*)/, `$1 ${prefix}`)
            }

            if (/node_modules/.test(filePath)) {
              return selector // Do not prefix styles imported from node_modules
            }

            const annotation = rule.prev()
            if (
              annotation?.type === 'comment' &&
              annotation.text.trim() === 'no-prefix'
            ) {
              return selector // Do not prefix style rules that are preceded by: /* no-prefix */
            }

            return prefixedSelector
          },
        }),
      ],
    }),
    {
      name: 'copy-to-plugin-dist',
      closeBundle() {
        return copyDistFiles()
      },
    },
  ],
  // external: Object.keys(pkg.dependencies || {}),
})
