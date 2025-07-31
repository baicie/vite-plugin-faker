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

const processes = []

function startServerWithProcess({ args, cwd, errorMessage }) {
  // 使用 npm 运行，确保命令可用
  const _process = spawn('npm', ['run', 'dev', '--', ...args], {
    stdio: 'inherit',
    cwd,
  })

  processes.push(_process)

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

process.on('SIGINT', () => {
  console.log('\n正在关闭所有服务...')

  // 向所有子进程发送终止信号
  processes.forEach(proc => {
    proc.kill('SIGINT')
  })

  // 设置一个超时，如果子进程没有正常退出，则强制退出
  const forceExitTimeout = setTimeout(() => {
    console.log('部分服务未能正常关闭，强制退出')
    process.exit(1)
  }, 3000)

  // 如果所有子进程都已经退出，清除超时并退出
  const checkInterval = setInterval(() => {
    if (processes.length === 0) {
      clearInterval(checkInterval)
      clearTimeout(forceExitTimeout)
      console.log('所有服务已成功关闭')
      process.exit(0)
    }
  }, 100)
})

startServer()
