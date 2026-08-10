import type {
  MockContext,
  QueryObject,
  ResponseGeneratorOptions,
} from '@baicie/faker-shared'
import { extend, sleep } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import qs from 'qs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DBManager } from '@baicie/faker-core'
import { generateResponseMap, readBody, restoreBody } from '@baicie/faker-core'

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
  dbManager: DBManager,
  options: ResponseGeneratorOptions = {},
): (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: any) => void,
) => void {
  const mockDB = dbManager.getMocksDB()

  return async function (req: any, res: any, next: any) {
    try {
      let mock = mockDB.findMock(req)

      if (mock && !mock.enabled) {
        mock = undefined
      }

      if (!mock) {
        mock = mockDB.findMockAdvanced({
          url: req.url!,
          method: req.method || 'GET',
          headers: req.headers,
          query: parseQuery(req.url!),
          body: await readBody(req),
        })
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
        url: req.url!,
        method: req.method!,
        headers: req.headers,
        query: parseQuery(req.url!),
        body: await readBody(req),
      }

      const response = await generate(mock, ctx, options)

      // ⏱ delay
      if (response.delay > 0) {
        await sleep(response.delay)
      }

      // status
      res.statusCode = response.status

      const defaultHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Mock-Source': response.source ?? 'static',
        'X-Mock-Id': response.meta?.mockId ?? 'unknown',
      }
      const responseHeaders = extend({}, defaultHeaders, response.headers)
      // headers
      for (const [k, v] of Object.entries(responseHeaders)) {
        res.setHeader(k, v)
      }

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
