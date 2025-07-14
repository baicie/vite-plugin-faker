import type { Plugin } from 'vite'
import { MockStorage } from './storage'
import type { StorageOptions } from './storage'
import { ServerAdapter } from './server-adapter'
// 移除静态导入
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exactRegex } from '@rolldown/pluginutils'

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

export const preambleCode = `import { fakerUI } from "__BASE__${runtimePublicPath.slice(
  1,
)}";
  fakerUI(document.querySelector(__MOUNT_TARGET__));`

const getPreambleCode = (base: string, mountTarget: string): string =>
  preambleCode
    .replace('__BASE__', base)
    .replace('__MOUNT_TARGET__', `'${mountTarget}'`)

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const { mountTarget = '#mock-ui', storageDir = '.mock' } = options
  // 创建服务器适配器
  const serverAdapter = new ServerAdapter({ storageDir })

  // 创建存储实例
  const mockStorage = new MockStorage({
    storageDir,
    serverAdapter,
  })
  return {
    name: 'vite-plugin-faker',
    apply: 'serve',
    resolveId: {
      filter: { id: exactRegex(runtimePublicPath) },
      handler(id) {
        if (id === runtimePublicPath) {
          return id
        }
      },
    },
    load: {
      filter: { id: exactRegex(runtimePublicPath) },
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
        },
        {
          tag: 'div',
          attrs: {
            id: mountTarget.slice(1),
          },
          injectTo: 'body',
        },
      ]
    },
  }
}

export * from './types'
export * from './storage'
export * from './server-adapter'

export default viteFaker
