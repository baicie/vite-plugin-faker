import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type HtmlTagDescriptor,
  type Plugin,
  type ViteDevServer,
  mergeAlias,
} from 'vite'
import { type LoggerConfig, initLogger, logger } from '@baicie/logger'
import { DBManager } from './db'
import { WSServer } from './ws-server'
import { extend } from 'lodash-es'
import {
  CLIENT_ALIAS,
  CLIENT_INTERCEPTOR_PATH,
  CLIENT_UI_CSS,
  CLIENT_UI_PATH,
} from './constants'

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

let server: ViteDevServer | null = null
let dbManager: DBManager | null = null
export let cacheDir: string | undefined
export let _baseDir: string | undefined

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
      dbManager = DBManager.getInstance()
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
      const injectArr = [CLIENT_UI_PATH, CLIENT_UI_CSS, CLIENT_INTERCEPTOR_PATH]
      const tags: HtmlTagDescriptor[] = injectArr.map(item => {
        return {
          tag: 'script',
          attrs: {
            type: 'module',
            src: path.posix.join(server.config.base, item),
          },
          injectTo: 'head-prepend',
        }
      })
      return {
        html,
        tags,
      }
    },
  }
}

export * from './types'

export default viteFaker
