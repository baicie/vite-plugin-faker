import { UI_PATH, type UiOptionsMode, cleanUrl } from '@baicie/faker-shared'
import { type LoggerConfig, logger } from '@baicie/logger'
import * as path from 'node:path'
import pc from 'picocolors'
import {
  type HtmlTagDescriptor,
  type Plugin,
  type ViteDevServer,
  mergeAlias,
  normalizePath,
} from 'vite'
import { resolveConfig } from './config'
import {
  CLIENT_ALIAS,
  CLIENT_INTERCEPTOR_PATH,
  CLIENT_UI_PATH,
  INTERCEPTOR_PATH,
  UI_ENTRY,
} from './constants'
import { DBManager } from './db'
import { mockMiddleware } from './middlewares/mock'
import { routeMiddleware } from './middlewares/route'
import { WSServer } from './ws-server'

export interface ViteFakerOptions {
  /**
   * ui target mount element id
   * @default '#mock-ui'
   */
  mountTarget?: string
  /**
   * mock config directory
   * @default '.mock'
   */
  storeDir?: string
  /**
   * @description logger options
   */
  loggerOptions?: Partial<LoggerConfig>

  uiOptions?: {
    /**
     * @description ws server port
     * @default 3456
     */
    wsPort?: number
    /**
     * @description default request timeout times
     * @default 10 * 1000
     */
    timeout?: number
    /**
     * @description button or route mode
     * @default 'route'
     */
    mode?: UiOptionsMode
  }
}

let server: ViteDevServer | null = null
export let dbManager: DBManager | null = null
export let cacheDir: string | undefined
export let _baseDir: string | undefined

const normalizedUIEntry = normalizePath(UI_ENTRY)
const normalizedInterceptorEntry = normalizePath(INTERCEPTOR_PATH)

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const _config = resolveConfig(options)

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
      _baseDir = path.resolve(config.root, _config.storeDir)
      dbManager = DBManager.getInstance(cacheDir, _baseDir)
    },
    configureServer(_server) {
      server = _server
      const config = _server.config

      server.middlewares.use(mockMiddleware(server))
      server.middlewares.use(routeMiddleware(server, _config))

      if (dbManager) {
        try {
          new WSServer(dbManager, server, _config)
          logger.info('[Faker] WebSocket 服务器已启动')
        } catch (error) {
          logger.error('[Faker] WebSocket 服务器启动失败:', error)
        }
      }

      if (_config.uiOptions?.mode === 'route') {
        const _print = server.printUrls
        server.printUrls = () => {
          let host = `${config.server.https ? 'https' : 'http'}://localhost:${config.server.port || '80'}`

          const url = server?.resolvedUrls?.local[0]

          if (url) {
            try {
              const u = new URL(url)
              host = `${u.protocol}//${u.host}`
            } catch (error) {
              config.logger.warn(`Parse resolved url failed: ${error}`)
            }
          }

          _print()

          if (!_config.silent) {
            const colorUrl = (url: string) =>
              pc.green(
                url.replace(/:(\d+)\//, (_, port) => `:${pc.bold(port)}`),
              )

            config.logger.info(
              `  ${pc.green('➜')}  ${pc.bold('FakerUI')}: ${colorUrl(`${host}${config.base}${UI_PATH}/`)}`,
            )
          }
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
      if (_config.uiOptions?.mode === 'button') {
        tags.push({
          tag: 'div',
          attrs: {
            id: 'mock-ui',
          },
          injectTo: 'body',
        })
      }
      return {
        html,
        tags,
      }
    },
    transform(code, id) {
      const cleanId = cleanUrl(id)
      if (
        cleanId === normalizedUIEntry ||
        cleanId === normalizedInterceptorEntry
      ) {
        logger.debug('cleanId', cleanId)
        logger.debug('mountTarget', _config.mountTarget)
        return code
          .replace(`__MOUNT_TARGET__`, JSON.stringify(_config.mountTarget))
          .replace(
            `__FAKER_WS_PORT__`,
            JSON.stringify(_config.uiOptions?.wsPort),
          )
          .replace(
            `__FAKER_LOGGER_OPTIONS__`,
            JSON.stringify(_config.loggerOptions),
          )
          .replace(`__FAKER_UI_OPTIONS__`, JSON.stringify(_config.uiOptions))
      }
      return code
    },
  }
}

export default viteFaker
