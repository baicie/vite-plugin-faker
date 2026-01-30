import { type Compiler, type WebpackPluginInstance } from 'webpack'
import path from 'node:path'
import { logger } from '@baicie/logger'
import {
  CLIENT_INTERCEPTOR_PATH,
  CLIENT_UI_CSS,
  CLIENT_UI_PATH,
} from './constants'
import { DBManager } from '@baicie/faker-core'
import { mockMiddleware } from './middlewares/mock'
import { routeMiddleware } from './middlewares/route'
import { WSServer } from './ws-server'
import { resolveConfig } from './config'
import type { FakerOptions, FakerConfig } from './types'

export class WebpackPluginFaker implements WebpackPluginInstance {
  private config: FakerConfig
  private dbManager: DBManager | null = null
  // @ts-ignore
  private wsServer: WSServer | null = null

  constructor(options: FakerOptions = {}) {
    this.config = resolveConfig(options)
  }

  apply(compiler: Compiler): void {
    // 1. Initialize DBManager
    const cacheDir = path.resolve(
      process.cwd(),
      'node_modules/.cache/webpack-plugin-faker',
    )
    const baseDir = path.resolve(process.cwd(), this.config.storeDir)
    this.dbManager = DBManager.getInstance(cacheDir, baseDir)

    // 2. Setup Middleware and WebSocket
    // Webpack Dev Server setup
    const setupDevServer = (devServer: any) => {
      if (!devServer) return

      // Setup WebSocket Server
      // We attach to the devServer's http server
      const originalOnListening = devServer.onListening
      devServer.onListening = (devServerApi: any) => {
        if (!devServerApi) return
        const server = devServerApi.server
        if (server && this.dbManager) {
          try {
            this.wsServer = new WSServer(this.dbManager, server, this.config)
            logger.info('[Faker] WebSocket Server initialized')
          } catch (e) {
            logger.error('[Faker] WebSocket Server initialization failed', e)
          }
        }
        if (originalOnListening) {
          originalOnListening(devServerApi)
        }
      }

      // Setup Middlewares
      // Webpack 5 uses setupMiddlewares
      if (devServer.setupMiddlewares) {
        const originalSetupMiddlewares = devServer.setupMiddlewares
        devServer.setupMiddlewares = (
          middlewares: any[],
          devServerApi: any,
        ) => {
          if (this.dbManager) {
            // Add route middleware (for UI assets)
            middlewares.unshift({
              name: 'faker-route-middleware',
              middleware: routeMiddleware(
                this.config,
                devServer.devMiddleware?.publicPath || '/',
              ),
            })
            // Add mock middleware (for API mocking)
            middlewares.unshift({
              name: 'faker-mock-middleware',
              middleware: mockMiddleware(this.dbManager),
            })
          }

          if (originalSetupMiddlewares) {
            return originalSetupMiddlewares(middlewares, devServerApi)
          }
          return middlewares
        }
      }
      // Webpack 4 uses before/after
      else if (devServer.before) {
        const originalBefore = devServer.before
        devServer.before = (app: any, server: any, compiler: any) => {
          if (this.dbManager) {
            // app is express app usually
            const publicPath = compiler.options.output?.publicPath || '/'
            app.use(routeMiddleware(this.config, publicPath as string))
            app.use(mockMiddleware(this.dbManager!))
          }
          if (originalBefore) {
            originalBefore(app, server, compiler)
          }
        }
      }
    }

    // Try to modify devServer config
    if (compiler.options.devServer) {
      setupDevServer(compiler.options.devServer)
    } else {
      // If devServer is not present in options (e.g. CLI), we might not catch it easily here.
      // But typically it is.
      logger.warn(
        '[Faker] devServer options not found in compiler options. Make sure you are running webpack-dev-server.',
      )
    }

    // 3. Inject Scripts via HtmlWebpackPlugin
    compiler.hooks.compilation.tap('WebpackPluginFaker', compilation => {
      // Check if HtmlWebpackPlugin is used
      const HtmlWebpackPlugin = (compiler.options.plugins || []).find(
        p => p && p.constructor.name === 'HtmlWebpackPlugin',
      )
      // Or try to get hooks from compilation
      // We rely on the hook name string if HtmlWebpackPlugin is present

      const hooks =
        (HtmlWebpackPlugin as any)?.constructor?.getHooks?.(compilation) ||
        (compilation.hooks as any).htmlWebpackPluginAlterAssetTags

      if (hooks && hooks.alterAssetTagGroups) {
        hooks.alterAssetTagGroups.tapAsync(
          'WebpackPluginFaker',
          (data: any, cb: any) => {
            this.injectScripts(data, compiler)
            cb(null, data)
          },
        )
      } else if (hooks && hooks.alterAssetTags) {
        hooks.alterAssetTags.tapAsync(
          'WebpackPluginFaker',
          (data: any, cb: any) => {
            // Adapt to old structure if needed, or just try
            this.injectScripts(data, compiler)
            cb(null, data)
          },
        )
      } else {
        // Fallback or specific HtmlWebpackPlugin version handling
        // Webpack 5 + HtmlWebpackPlugin 5 uses getHooks(compilation).alterAssetTags
        // We can try to require html-webpack-plugin to get getHooks if available
        try {
          const HtmlWebpackPlugin = require('html-webpack-plugin')
          if (HtmlWebpackPlugin.getHooks) {
            HtmlWebpackPlugin.getHooks(
              compilation,
            ).alterAssetTagGroups.tapAsync(
              'WebpackPluginFaker',
              (data: any, cb: any) => {
                this.injectScripts(data, compiler)
                cb(null, data)
              },
            )
          }
        } catch (e) {
          // HtmlWebpackPlugin not found
        }
      }
    })
  }

  private injectScripts(data: any, compiler: Compiler) {
    const publicPath = (compiler.options.output?.publicPath as string) || '/'
    const base = publicPath.endsWith('/') ? publicPath : publicPath + '/'

    const injectArr = [CLIENT_INTERCEPTOR_PATH, CLIENT_UI_CSS, CLIENT_UI_PATH]

    const scripts: any[] = injectArr.map(item => {
      return {
        tagName: 'script',
        voidTag: false,
        attributes: {
          type: 'module',
          src: path.posix.join(base, item.replace(/^\//, '')),
        },
      }
    })

    // Handle data structure differences
    const bodyTags =
      data.bodyTags || (data.assetTags && data.assetTags.bodyTags)
    const headTags = data.headTags || (data.assetTags && data.assetTags.scripts)

    if (this.config.uiOptions?.mode === 'button') {
      const divTag = {
        tagName: 'div',
        voidTag: false,
        attributes: {
          id: 'mock-ui',
        },
      }

      if (bodyTags) {
        bodyTags.push(divTag)
      }

      const scriptTags = scripts.filter(s => s.tagName === 'script')
      if (headTags) {
        headTags.push(...scriptTags)
      }
    } else {
      if (headTags) {
        headTags.push(...scripts)
      }
    }
  }
}

export default WebpackPluginFaker
