import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'
import { exactRegex } from '@rolldown/pluginutils'
import { logger } from '@baicie/logger'
import { DBManager } from './db'
import { WSServer } from './ws-server'
import { loadVirtualModule } from './virtual-modules'

export interface ViteFakerOptions {
  /**
   * 挂载UI面板的目标元素选择器
   * @default '#mock-ui'
   */
  mountTarget?: string

  storeDir?: string
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

// 设置代理监听器（在 config 阶段调用）
function setupProxyListeners(proxyServer: any, context: string) {
  logger.info(`🎯 [Faker Plugin] 设置代理监听器: ${context}`)

  // 请求拦截
  proxyServer.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
    const startTime = Date.now()

    // 使用 Symbol 来避免类型错误
    const startTimeSymbol = Symbol('startTime')
    ;(req as any)[startTimeSymbol] = startTime

    logger.info('📤 [代理请求]', {
      method: req.method,
      url: req.url,
      host: proxyReq.getHeader('host'),
    })

    // 如果 dbManager 可用，记录请求
    if (dbManager) {
      try {
        const requestsDB = dbManager.getRequestsDB()
        const requestInfo = {
          method: req.method || 'GET',
          url: req.url || '',
          headers: req.headers,
          timestamp: startTime,
          isProxy: true,
          proxyTarget: proxyReq.getHeader('host') || 'unknown',
          context: context,
        }

        requestsDB.saveRequest(`${context}${req.url}`, {
          req: requestInfo,
          res: null,
          duration: 0,
          isProxy: true,
        })
      } catch (error) {
        logger.error('保存代理请求失败:', error)
      }
    }
  })

  // 响应拦截
  proxyServer.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
    const endTime = Date.now()
    const startTimeSymbol = Symbol('startTime')
    const startTime = (req as any)[startTimeSymbol] || endTime
    const duration = endTime - startTime

    logger.info('📥 [代理响应]', {
      statusCode: proxyRes.statusCode,
      url: req.url,
      duration,
    })

    const bodyChunks: Buffer[] = []

    proxyRes.on('data', (chunk: Buffer) => {
      bodyChunks.push(chunk)
    })

    proxyRes.on('end', () => {
      const responseBody = Buffer.concat(bodyChunks).toString('utf8')

      // 记录响应信息
      if (dbManager) {
        try {
          const requestsDB = dbManager.getRequestsDB()
          const responseInfo = {
            statusCode: proxyRes.statusCode,
            statusMessage: proxyRes.statusMessage,
            headers: proxyRes.headers,
            body: responseBody,
            timestamp: endTime,
          }

          const requestKey = `${context}${req.url}`
          const existingRequest = requestsDB.getRequest(requestKey)

          if (existingRequest) {
            existingRequest.res = responseInfo
            existingRequest.duration = duration

            requestsDB.updateRequest(requestKey, existingRequest)

            logger.info('✅ 代理请求记录已更新', {
              method: req.method,
              url: req.url,
            })
          }
        } catch (error) {
          logger.error('更新代理响应失败:', error)
        }
      }

      // 记录响应体（如果不太大）
      if (responseBody.length < 500) {
        logger.info('📋 [代理响应体]', {
          url: req.url,
          bodyPreview: responseBody.substring(0, 100),
        })
      }
    })
  })

  // 错误处理
  proxyServer.on('error', (error: Error, req: any, _res: any) => {
    logger.error('❌ [代理错误]', {
      url: req.url,
      message: error.message,
    })

    if (dbManager) {
      try {
        const requestsDB = dbManager.getRequestsDB()
        const requestKey = `${context}${req.url}`
        const existingRequest = requestsDB.getRequest(requestKey)

        if (existingRequest) {
          existingRequest.error = {
            error: error.message,
            timestamp: Date.now(),
          }
          requestsDB.updateRequest(requestKey, existingRequest)
        }
      } catch (saveError) {
        logger.error('保存代理错误失败:', saveError)
      }
    }
  })
}

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const { mountTarget = '#mock-ui', storeDir = '.mock' } = options

  return {
    name: 'vite-plugin-faker',
    apply: 'serve',
    config(config) {
      logger.info('🔧 [Faker Plugin] config hook 被调用')

      // 确保有 server 配置
      if (!config.server) {
        config.server = {}
      }

      // 确保有 proxy 配置
      if (!config.server.proxy) {
        config.server.proxy = {}
        logger.info('🔧 [Faker Plugin] 未发现代理配置，创建空配置')
      }

      // 修改每个代理配置，添加我们的监听器
      const proxyConfig = config.server.proxy
      const proxyKeys = Object.keys(proxyConfig)

      logger.info(`🔧 [Faker Plugin] 发现 ${proxyKeys.length} 个代理配置:`, {
        proxyKeys,
      })

      for (const [context, options] of Object.entries(proxyConfig)) {
        logger.info(`🔧 [Faker Plugin] 处理代理配置: ${context}`, {
          optionType: typeof options,
          options,
        })

        if (typeof options === 'object' && options != null) {
          const opt = options as any
          const originalConfigure = opt.configure

          // 包装 configure 函数
          opt.configure = (proxyServer: any, proxyOptions: any) => {
            logger.info(`🔧 [Faker Plugin] configure 被调用: ${context}`)

            // 先调用用户原有的配置
            if (originalConfigure) {
              originalConfigure(proxyServer, proxyOptions)
              logger.info(`✅ [Faker Plugin] 用户原有配置已调用: ${context}`)
            }

            // 添加我们的监听器
            setupProxyListeners(proxyServer, context)
          }

          logger.info(`🔧 [Faker Plugin] 已修改代理配置: ${context}`)
        }
      }

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
