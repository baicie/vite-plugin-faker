import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const args = process.argv.slice(2)
const __dirname = dirname(fileURLToPath(import.meta.url))
const __root = resolve(__dirname, '..')
const packages = resolve(__root, 'packages')
const playground = resolve(__root, 'playground')
const uiPackage = resolve(packages, 'faker-ui')
const pluginPackage = resolve(packages, 'vite-plugin-faker')
const vueAppPackage = resolve(playground, 'vue-app')

function startServerWithProcess({ args, cwd, errorMessage }) {
  // 使用 npm 运行，确保命令可用
  const _process = spawn('npm', ['run', 'dev', '--', ...args], {
    stdio: 'inherit',
    cwd,
  })

  _process.on('close', code => {
    process.exit(code)
  })

  _process.on('error', error => {
    console.error(errorMessage, error)
    process.exit(1)
  })

  return _process
}

function startServer() {
  startServerWithProcess({
    args,
    cwd: uiPackage,
    errorMessage: 'Failed to start UI server',
  })

  startServerWithProcess({
    args,
    cwd: pluginPackage,
    errorMessage: 'Failed to start plugin server',
  })

  startServerWithProcess({
    args,
    cwd: vueAppPackage,
    errorMessage: 'Failed to start vue-app server',
  })
}

startServer()
