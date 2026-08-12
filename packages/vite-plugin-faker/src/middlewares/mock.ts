import type {
  MockConfig,
  MockContext,
  QueryObject,
  ResponseGeneratorOptions,
} from '@baicie/faker-shared'
import { extend, sleep } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import qs from 'qs'
import type { Connect, ViteDevServer } from 'vite'
import { dbManager } from '../index'
import {
  generateResponseMap,
  readBody,
  restoreBody,
  sanitizeMockResponseHeaders,
} from '@baicie/faker-core'

export function parseQuery<T extends QueryObject = QueryObject>(
  url: string,
): T {
  const idx = url.indexOf('?')
  if (idx === -1) return {} as T

  return qs.parse(url.slice(idx + 1), {
    allowDots: true,
    depth: 5,
    parseArrays: true,
  }) as unknown as T
}

export function mockMiddleware(
  _server: ViteDevServer,
  options: ResponseGeneratorOptions = {},
): Connect.NextHandleFunction {
  const mockDB = dbManager?.getMocksDB()

  return async function viteMockMiddleware(req, res, next) {
    try {
      if (!mockDB) return next()

      const url = req.url || '/'
      const method = req.method || 'GET'
      const query = parseQuery(url)
      const body = await readBody(req)
      let mock: MockConfig | undefined
      try {
        mock = mockDB.findMockAdvanced({
          url,
          method,
          headers: req.headers,
          query,
          body,
        })
      } catch (matcherError) {
        logger.error('[Faker] mock 匹配失败，回退到 next():', matcherError)
        restoreBody(req)
        return next()
      }

      if (!mock || !mock.enabled) {
        restoreBody(req)
        return next()
      }

      const generate = generateResponseMap[mock.type]
      if (!generate) {
        restoreBody(req)
        return next()
      }

      const ctx: MockContext = {
        req,
        url,
        method,
        headers: req.headers,
        query,
        body,
      }

      const response = await generate(mock, ctx, options)

      // ⏱ delay
      if (response.delay > 0) {
        await sleep(response.delay)
      }

      // status
      res.statusCode = response.status

      // response headers
      const responseHeaders = sanitizeMockResponseHeaders(
        extend(
          {},
          {
            'Content-Type': 'application/json; charset=utf-8',
          },
          response.headers,
        ),
      )
      for (const [k, v] of Object.entries(responseHeaders)) {
        res.setHeader(k, v)
      }
      // Append authoritative mock markers after sanitization so request
      // handlers can never spoof the mock id / source.
      res.setHeader('X-Mock-Source', response.source || 'static')
      res.setHeader(
        'X-Mock-Id',
        (response.meta && response.meta.mockId) || 'unknown',
      )

      // body
      res.end(
        typeof response.body === 'string'
          ? response.body
          : JSON.stringify(response.body),
      )

      return
    } catch (err) {
      logger.error('mock error', err)
      return next(err)
    }
  }
}
