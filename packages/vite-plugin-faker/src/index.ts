import * as path from 'node:path'
import {
  type HtmlTagDescriptor,
  type Plugin,
  type ViteDevServer,
  mergeAlias,
  normalizePath,
} from 'vite'
import { type LoggerConfig, initLogger, logger } from '@baicie/logger'
import { DBManager } from './db'
import { WSServer } from './ws-server'
import { extend } from 'lodash-es'
import {
  CLIENT_ALIAS,
  CLIENT_INTERCEPTOR_PATH,
  CLIENT_UI_PATH,
  INTERCEPTOR_PATH,
  UI_ENTRY,
} from './constants'
import { cleanUrl } from '@baicie/faker-shared'

export interface ViteFakerOptions {
  /**
   * 挂载UI面板的目标元素选择器
   * @default '#mock-ui'
   */
  mountTarget?: string
  /**
   * 存储目录
   * @default '.mock'
   */
  storeDir?: string
  /**
   * @description 日志配置
   */
  loggerOptions?: Partial<LoggerConfig>

  uiOptions?: {
    /**
     * @description ws服务器端口 默认复用vite ws server
     */
    wsPort?: string
    /**
     * @description 默认请求超时时间 默认10秒
     * @default 10 * 1000
     */
    timeout?: number
  }
}

let server: ViteDevServer | null = null
let dbManager: DBManager | null = null
export let cacheDir: string | undefined
export let _baseDir: string | undefined

const normalizedUIEntry = normalizePath(UI_ENTRY)
const normalizedInterceptorEntry = normalizePath(INTERCEPTOR_PATH)

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const {
    mountTarget = '#mock-ui',
    storeDir = '.mock',
    loggerOptions,
    uiOptions = {},
  } = options
  const _loggerOptions = extend(
    {
      enabled: true,
      level: 'error',
      showTimestamp: true,
      showLevel: true,
    },
    loggerOptions,
  )

  initLogger(
    extend(
      {
        prefix: '[Faker Plugin]',
      },
      _loggerOptions,
    ),
  )

  return {
    name: 'vite-plugin-faker',
    apply: 'serve',
    enforce: 'pre',
    config(config) {
      if (!config.resolve) {
        config.resolve = {}
      }
      if (!config.resolve.alias) {
        config.resolve.alias = {}
      }
      config.resolve.alias = mergeAlias(config.resolve.alias, CLIENT_ALIAS)
      return config
    },
    configResolved(config) {
      cacheDir = path.resolve(config.cacheDir, 'vite-plugin-faker')
      _baseDir = path.resolve(config.root, storeDir)
      dbManager = DBManager.getInstance(cacheDir, _baseDir)
    },
    configureServer(_server) {
      server = _server

      if (dbManager) {
        try {
          new WSServer(server, dbManager)
          logger.info('[Faker] WebSocket 服务器已启动')
        } catch (error) {
          logger.error('[Faker] WebSocket 服务器启动失败:', error)
        }
      }
    },
    transformIndexHtml(html) {
      const injectArr = [CLIENT_INTERCEPTOR_PATH, CLIENT_UI_PATH]
      const tags: HtmlTagDescriptor[] = injectArr.map(item => {
        return {
          tag: 'script',
          attrs: {
            type: 'module',
            src: path.posix.join(server!.config.base, item),
          },
          injectTo: 'head',
        }
      })
      return {
        html,
        tags: [
          ...tags,
          {
            tag: 'div',
            attrs: {
              id: 'mock-ui',
            },
            injectTo: 'body',
          },
        ],
      }
    },
    transform(code, id) {
      const cleanId = cleanUrl(id)
      if (
        cleanId === normalizedUIEntry ||
        cleanId === normalizedInterceptorEntry
      ) {
        logger.debug('cleanId', cleanId)
        logger.debug('mountTarget', mountTarget)
        return code
          .replace(`__MOUNT_TARGET__`, JSON.stringify(mountTarget))
          .replace(`__FAKER_WS_PORT__`, JSON.stringify(uiOptions?.wsPort))
          .replace(`__FAKER_LOGGER_OPTIONS__`, JSON.stringify(_loggerOptions))
          .replace(`__FAKER_UI_OPTIONS__`, JSON.stringify(uiOptions))
      }
      return code
    },
  }
}

export * from './types'

export default viteFaker
