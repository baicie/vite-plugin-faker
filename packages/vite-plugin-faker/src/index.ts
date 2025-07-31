import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'

import { exactRegex } from '@rolldown/pluginutils'
import { registerApis } from './api'
import { DBManager } from './db'
import { holdMiddleware } from './middleware'

export interface ViteFakerOptions {
  /**
   * 挂载UI面板的目标元素选择器
   * @default '#mock-ui'
   */
  mountTarget?: string
}
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const runtimePublicPath = '/@faker-ui'
const fakeruiRuntimePath = path.resolve(__dirname, 'faker-ui.js')
const fakeruiCssPath = path.resolve(__dirname, 'faker-ui.css')

export const preambleCode = `import { fakerUI } from "__BASE__${runtimePublicPath.slice(
  1,
)}";
  fakerUI(__MOUNT_TARGET__);`

const getPreambleCode = (base: string, mountTarget: string): string =>
  preambleCode
    .replace('__BASE__', base)
    .replace('__MOUNT_TARGET__', `'${mountTarget}'`)

let server: ViteDevServer | null = null
export let cacheDir: string | null = null
let dbManager: DBManager | null = null

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const { mountTarget = '#mock-ui' } = options

  return {
    name: 'vite-plugin-faker',
    apply: 'serve',
    resolveId: {
      filter: {
        id: [exactRegex(runtimePublicPath)],
      },
      handler(id) {
        if (id === runtimePublicPath) {
          return id
        }
      },
    },
    load: {
      filter: {
        id: [exactRegex(runtimePublicPath)],
      },
      handler(id) {
        if (id === runtimePublicPath) {
          return readFileSync(fakeruiRuntimePath, 'utf-8')
        }
      },
    },
    transformIndexHtml(_, config) {
      return [
        {
          tag: 'script',
          attrs: {
            type: 'module',
          },
          children: getPreambleCode(config.server!.config.base, mountTarget),
          injectTo: 'body',
        },
        {
          tag: 'div',
          attrs: {
            id: mountTarget.slice(1),
          },
          injectTo: 'body',
        },
        {
          tag: 'style',
          attrs: {
            type: 'text/css',
          },
          children: readFileSync(fakeruiCssPath, 'utf-8'),
          injectTo: 'head',
        },
      ]
    },
    configResolved(config) {
      cacheDir = path.resolve(config.cacheDir, 'vite-plugin-faker')
      dbManager = DBManager.getInstance()
    },
    configureServer(_server) {
      server = _server
      const middlewares = server.middlewares
      middlewares.use(holdMiddleware(server, dbManager))
      registerApis(server, dbManager)
    },
  }
}

export * from './types'

export default viteFaker
