import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Compiler } from 'webpack'
import { DBManager } from '@baicie/faker-core'
import { WebpackPluginFaker, webpackFaker } from '../src/index'
import type { FakerOptions } from '../src/index'

interface TestDevServerOptions {
  setupMiddlewares?: (
    middlewares: Array<{ name: string; middleware: unknown }>,
    devServer: object,
  ) => Array<{ name: string; middleware: unknown }>
}

function createCompiler(devServer?: TestDevServerOptions): Compiler {
  return {
    hooks: {
      compilation: {
        tap: vi.fn(),
      },
    },
    options: {
      devServer,
      output: {},
      plugins: [],
    },
  } as unknown as Compiler
}

describe('WebpackPluginFaker', () => {
  afterEach(function () {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('registers middleware when webpack-dev-server is configured', () => {
    vi.stubEnv('WEBPACK_SERVE', 'true')
    const devServer: TestDevServerOptions = {}
    const dbManager = {
      getMocksDB: function () {
        return {
          findMock: vi.fn(),
          findMockAdvanced: vi.fn(),
        }
      },
    } as unknown as DBManager
    vi.spyOn(DBManager, 'getInstance').mockReturnValue(dbManager)

    new WebpackPluginFaker().apply(createCompiler(devServer))

    expect(devServer.setupMiddlewares).toBeTypeOf('function')
    const middlewares = devServer.setupMiddlewares!([], {})
    expect(
      middlewares.map(function (middleware) {
        return middleware.name
      }),
    ).toEqual(['faker-mock-middleware', 'faker-route-middleware'])
  })

  it('does not initialize during a build with dev-server config', () => {
    const devServer: TestDevServerOptions = {}
    const getInstance = vi.spyOn(DBManager, 'getInstance')

    new WebpackPluginFaker().apply(createCompiler(devServer))

    expect(getInstance).not.toHaveBeenCalled()
    expect(devServer.setupMiddlewares).toBeUndefined()
  })

  it('exposes a factory that forwards plugin options', () => {
    vi.stubEnv('WEBPACK_SERVE', 'true')
    const getInstance = vi.spyOn(DBManager, 'getInstance')
    getInstance.mockReturnValue({} as DBManager)
    const options: FakerOptions = {
      storeDir: '.custom-mocks',
    }

    const plugin = webpackFaker(options)
    plugin.apply(createCompiler({}))

    expect(plugin).toBeInstanceOf(WebpackPluginFaker)
    expect(getInstance).toHaveBeenCalledWith(
      expect.any(String),
      path.resolve(process.cwd(), '.custom-mocks'),
    )
  })
})
