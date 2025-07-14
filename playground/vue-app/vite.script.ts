import path from 'node:path'
import { vitePluginFakerPath } from './../../packages/path'
import chokidar, { type FSWatcher } from 'chokidar'
import { spawn, ChildProcess } from 'node:child_process'

const distPath = path.resolve(vitePluginFakerPath, 'dist')

let watcher: FSWatcher
let viteProcess: ChildProcess

async function startWatcher() {
  watcher = chokidar.watch(distPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100,
    },
    atomic: true,
    ignored: /\.(map|d\.ts)$/,
  })

  watcher.on('change', async (_, filePath) => {
    viteProcess.kill()
    startViteProcess()
  })
}

function startViteProcess() {
  viteProcess = spawn('vite', ['--config', 'vite.config.ts'], {
    stdio: 'inherit',
  })

  viteProcess.on('exit', code => {
    console.log('viteProcess exit', code)
  })
}

async function startServer() {
  startViteProcess()
  await startWatcher()
}

startServer().catch(err => {
  console.error(err)
})
