import type { IncomingMessage } from 'node:http'
import typeis from 'type-is'
import { form, json, text } from 'co-body'
import type { ParsedBody } from '@baicie/faker-shared'

export async function readBody(req: IncomingMessage): Promise<ParsedBody> {
  const method = req.method?.toUpperCase()

  if (!method || ['GET', 'HEAD'].includes(method)) {
    return undefined
  }

  const type = typeis(req, [
    'application/json',
    'application/x-www-form-urlencoded',
    'text/*',
  ])

  if (!type) {
    return undefined
  }

  try {
    if (type === 'application/json') {
      return await json(req, {
        limit: '2mb',
        strict: false,
      })
    }

    if (type === 'application/x-www-form-urlencoded') {
      return await form(req)
    }

    if (type.startsWith('text/')) {
      return await text(req)
    }
  } catch (err) {
    // mock 环境：吞掉错误，避免影响正常请求
    return undefined
  }

  return undefined
}
