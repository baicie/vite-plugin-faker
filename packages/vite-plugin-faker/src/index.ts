import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

import { exactRegex } from '@rolldown/pluginutils'
import { MockStorage } from './storage'
import type { StorageOptions } from './storage'
import { ServerAdapter } from './server-adapter'
// 移除静态导入

export interface ViteFakerOptions extends StorageOptions {
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

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const { mountTarget = '#mock-ui', storageDir = '.mock' } = options
  // 创建服务器适配器
  const serverAdapter = new ServerAdapter({ storageDir })

  // 创建存储实例
  const _mockStorage = new MockStorage({
    storageDir,
    serverAdapter,
  })
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
  }
}

export * from './types'
export * from './storage'
export * from './server-adapter'

export default viteFaker
