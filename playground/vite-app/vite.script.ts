import path from 'node:path'
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import chokidar, { type FSWatcher } from 'chokidar'
import {
  fakerUiPath,
  hackPath,
  vitePluginFakerPath,
} from './../../packages/path'
import kill from 'tree-kill'
import process from 'node:process'

const useShell = process.platform === 'win32'
const distPath = path.resolve(vitePluginFakerPath, 'dist')
const hackDistPath = path.resolve(hackPath, 'dist')
const uiDistPath = path.resolve(fakerUiPath, 'dist')

let watcher: FSWatcher
let viteProcess: ChildProcess

async function startWatcher() {
  watcher = chokidar.watch([distPath, hackDistPath, uiDistPath], {
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
  const viteBin = path.resolve('./node_modules/vite/bin/vite.js')
  viteProcess = spawn(
    process.execPath,
    [viteBin, '--config', 'vite.config.ts'],
    {
      stdio: 'inherit',
      shell: useShell,
    },
  )

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
