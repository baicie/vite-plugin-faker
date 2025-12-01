import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'
import { exactRegex } from '@rolldown/pluginutils'
import { type LoggerConfig, initLogger, logger } from '@baicie/logger'
import { DBManager } from './db'
import { WSServer } from './ws-server'
import { loadVirtualModule } from './virtual-modules'
import { extend } from 'lodash'

export interface ViteFakerOptions {
  /**
   * 挂载UI面板的目标元素选择器
   * @default '#mock-ui'
   */
  mountTarget?: string

  storeDir?: string
  /**
   * @description 日志配置
   */
  loggerOptions?: Partial<LoggerConfig>
}
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 拦截脚本路径
const interceptorPath = path.resolve(
  __dirname,
  '../faker-interceptor/dist/interceptor.js',
)

// UI 相关路径
const runtimePublicPath = '/@faker-ui'
const fakeruiRuntimePath = path.resolve(__dirname, 'faker-ui.js')
const fakeruiCssPath = path.resolve(__dirname, 'faker-ui.css')

// UI 初始化代码
export const uiPreambleCode = `import { fakerUI } from "__BASE__${runtimePublicPath.slice(
  1,
)}";
  await fakerUI(__MOUNT_TARGET__);`

const getUIPreambleCode = (base: string, mountTarget: string): string =>
  uiPreambleCode
    .replace('__BASE__', base)
    .replace('__MOUNT_TARGET__', `'${mountTarget}'`)

// 拦截脚本注入代码
const getInterceptorCode = (wsUrl: string): string => {
  // 如果拦截脚本已构建，读取它
  if (existsSync(interceptorPath)) {
    const interceptorCode = readFileSync(interceptorPath, 'utf-8')
    return `
      // 设置 WebSocket URL
      window.__FAKER_WS_URL__ = '${wsUrl}';
      
      // 注入拦截脚本
      ${interceptorCode}
      
      // 初始化拦截器（IIFE 会自动执行）
    `
  }

  // 如果未构建，使用内联代码（开发时）
  return `
    console.warn('[Faker] 拦截脚本未构建，请先运行 pnpm build');
    window.__FAKER_WS_URL__ = '${wsUrl}';
  `
}

let server: ViteDevServer | null = null
let dbManager: DBManager | null = null
export let cacheDir: string | null = null
export let _baseDir: string | null = null

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const {
    mountTarget = '#mock-ui',
    storeDir = '.mock',
    loggerOptions,
  } = options

  initLogger(
    extend(
      {
        enabled: true,
        level: 'debug',
        prefix: '[Faker Plugin]',
        showTimestamp: true,
        showLevel: true,
      },
      loggerOptions,
    ),
  )

  return {
    name: 'vite-plugin-faker',
    apply: 'serve',
    config(config) {
      logger.info('🔧 [Faker Plugin] config hook 被调用')

      return config
    },
    enforce: 'pre',
    resolveId: {
      filter: {
        id: [
          exactRegex(runtimePublicPath),
          exactRegex('/@faker-config'),
          exactRegex('/@faker-ws'),
        ],
      },
      handler(id) {
        if (
          id === runtimePublicPath ||
          id === '/@faker-config' ||
          id === '/@faker-ws'
        ) {
          return id
        }
      },
    },
    load: {
      filter: {
        id: [
          exactRegex(runtimePublicPath),
          exactRegex('/@faker-config'),
          exactRegex('/@faker-ws'),
        ],
      },
      handler(id) {
        if (id === runtimePublicPath) {
          if (existsSync(fakeruiRuntimePath)) {
            return readFileSync(fakeruiRuntimePath, 'utf-8')
          }
          return '// UI not built'
        }

        if (id === '/@faker-config' && dbManager) {
          return loadVirtualModule(id, dbManager)
        }

        if (id === '/@faker-ws') {
          // WebSocket 端点信息
          return `export const wsUrl = 'ws://localhost:${server?.config.server?.port || 5173}/@faker-ws'`
        }
      },
    },
    transformIndexHtml(html, ctx) {
      const base = ctx.server?.config.base || '/'
      const port = ctx.server?.config.server?.port || 5173
      const wsUrl = `ws://localhost:${port}${base}@faker-ws`

      const tags: any[] = []

      // 1. 注入拦截脚本（最优先，在 head 最前面）
      tags.push({
        tag: 'script',
        attrs: {
          type: 'text/javascript',
        },
        children: getInterceptorCode(wsUrl),
        injectTo: 'head-prepend', // 确保最早执行
      })

      // 2. 注入 UI（如果需要）
      if (existsSync(fakeruiRuntimePath)) {
        tags.push({
          tag: 'script',
          attrs: {
            type: 'module',
          },
          children: getUIPreambleCode(base, mountTarget),
          injectTo: 'head',
        })

        tags.push({
          tag: 'div',
          attrs: {
            id: mountTarget.slice(1),
          },
          injectTo: 'body',
        })

        if (existsSync(fakeruiCssPath)) {
          tags.push({
            tag: 'style',
            attrs: {
              type: 'text/css',
            },
            children: readFileSync(fakeruiCssPath, 'utf-8'),
            injectTo: 'head',
          })
        }
      }

      return tags
    },
    configResolved(config) {
      cacheDir = path.resolve(config.cacheDir, 'vite-plugin-faker')
      _baseDir = path.resolve(config.root, storeDir)
      dbManager = DBManager.getInstance()
    },
    configureServer(_server) {
      server = _server

      // 设置 WebSocket 服务器
      if (dbManager) {
        try {
          new WSServer(server, dbManager)
          logger.info('[Faker] WebSocket 服务器已启动')
        } catch (error) {
          logger.error('[Faker] WebSocket 服务器启动失败:', error)
        }
      }

      // 不再需要中间件拦截（已在浏览器端完成）
      // 但保留用于向后兼容或调试
    },
  }
}

export * from './types'

export default viteFaker
