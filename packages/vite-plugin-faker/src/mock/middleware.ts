import { dbManager } from '../index'
import { methodLineUrl } from '../utils'
import type { Connect, ViteDevServer } from 'vite'

export function mockMiddleware(
  _server: ViteDevServer,
): Connect.NextHandleFunction {
  const mock = dbManager?.getMocksDB()
  return async function viteMockMiddleware(req, res, next) {
    console.log(req.url)
    const key = methodLineUrl(req)
    mock?.findMock()
    try {
    } catch (error) {
    } finally {
      next()
    }
  }
}
