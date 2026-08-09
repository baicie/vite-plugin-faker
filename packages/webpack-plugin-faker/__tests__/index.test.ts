import type { Compiler } from 'webpack'
import { DBManager } from '@baicie/faker-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebpackPluginFaker, webpackFaker } from '../src/index'

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
  })

  it('registers middleware when webpack-dev-server is configured', () => {
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

  it('does not initialize during a build without dev-server config', () => {
    const getInstance = vi.spyOn(DBManager, 'getInstance')

    new WebpackPluginFaker().apply(createCompiler())

    expect(getInstance).not.toHaveBeenCalled()
  })

  it('exposes a factory matching the Vite plugin API', () => {
    expect(webpackFaker()).toBeInstanceOf(WebpackPluginFaker)
  })
})
