import path from 'node:path'
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import chokidar, { type FSWatcher } from 'chokidar'
import { vitePluginFakerPath } from './../../packages/path'
import kill from 'tree-kill'
import process from 'node:process'

const viteCmd = process.platform === 'win32' ? 'vite.cmd' : 'vite'
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

  watcher.on('change', async () => {
    if (viteProcess) {
      kill(viteProcess.pid!, 'SIGKILL')
    }
    startViteProcess()
  })
}

function startViteProcess() {
  viteProcess = spawn(viteCmd, ['--config', 'vite.config.ts'], {
    stdio: 'inherit',
    // shell: true,
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
