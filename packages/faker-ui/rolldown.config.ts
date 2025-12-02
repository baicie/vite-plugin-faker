import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fse from 'fs-extra'
import { findWorkspacePackages } from '@pnpm/find-workspace-packages'
import postcss from 'rollup-plugin-postcss'
import { defineConfig } from 'rolldown'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

const needAnalyze = process.env.ANALYZE === 'true'

// 定义根路径
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '../..')
const dtsPath = path.resolve(__dirname, 'index.d.ts')
const fakerUiPath = path.resolve(__dirname, 'dist')
const mockServiceWorkerPath = path.resolve(
  __dirname,
  'public/mockServiceWorker.js',
)

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
  fse.copyFileSync(
    mockServiceWorkerPath,
    path.resolve(targetPath, 'mockServiceWorker.js'),
  )
  fse.copySync(fakerUiPath, targetPath, { overwrite: true })
}

export default defineConfig({
  input: 'src/index.ts',
  treeshake: true,
  output: {
    dir: 'dist',
    entryFileNames: 'index.js',
    format: 'esm',
    sourcemap: true,
    inlineDynamicImports: true,
    manualChunks: undefined,
  },
  plugins: [
    vue(),
    vueJsx(),
    postcss({
      extract: 'index.css',
      minimize: true,
    }),
    needAnalyze && visualizer({ open: true }),
    {
      name: 'copy-to-plugin-dist',
      closeBundle() {
        return copyDistFiles()
      },
    },
  ],
  watch: {
    include: 'src/**',
  },
})
