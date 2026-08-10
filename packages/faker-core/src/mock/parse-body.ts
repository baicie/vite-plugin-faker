import type { IncomingMessage } from 'node:http'
import { PassThrough } from 'node:stream'
import typeis from 'type-is'
import qs from 'qs'
import type { ParsedBody } from '@baicie/faker-shared'

const MAX_PARSED_BODY_SIZE = 2 * 1024 * 1024

interface RequestBodyResult {
  body: ParsedBody
  rawBody?: Buffer
}

interface RequestBodyState {
  promise: Promise<RequestBodyResult>
  result?: RequestBodyResult
  restored: boolean
}

const requestBodyCache = new WeakMap<IncomingMessage, RequestBodyState>()

function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise(function (resolve, reject) {
    const chunks: Buffer[] = []

    function cleanup(): void {
      req.removeListener('aborted', onAborted)
      req.removeListener('data', onData)
      req.removeListener('error', onError)
      req.removeListener('end', onEnd)
    }

    function onData(chunk: Buffer | string): void {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }

    function onAborted(): void {
      cleanup()
      reject(new Error('Request body stream was aborted'))
    }

    function onError(error: Error): void {
      cleanup()
      reject(error)
    }

    function onEnd(): void {
      cleanup()
      resolve(Buffer.concat(chunks))
    }

    req.on('data', onData)
    req.once('aborted', onAborted)
    req.once('error', onError)
    req.once('end', onEnd)
  })
}

function parseRawBody(rawBody: Buffer, contentType: string): ParsedBody {
  if (rawBody.length > MAX_PARSED_BODY_SIZE) return undefined

  const source = rawBody.toString('utf8')
  try {
    if (contentType === 'application/json') {
      return JSON.parse(source) as ParsedBody
    }

    if (contentType === 'application/x-www-form-urlencoded') {
      return qs.parse(source) as Record<string, any>
    }

    if (contentType.startsWith('text/')) {
      return source
    }
  } catch {
    return undefined
  }

  return undefined
}

function readRequestBody(req: IncomingMessage): Promise<RequestBodyResult> {
  const cached = requestBodyCache.get(req)
  if (cached) return cached.promise

  const method = req.method ? req.method.toUpperCase() : ''
  const contentType = typeis(req, [
    'application/json',
    'application/x-www-form-urlencoded',
    'text/*',
  ])

  if (!method || method === 'GET' || method === 'HEAD' || !contentType) {
    return Promise.resolve({ body: undefined })
  }

  const state: RequestBodyState = {
    promise: Promise.resolve({ body: undefined }),
    restored: false,
  }
  state.promise = readRawBody(req)
    .then(function (rawBody): RequestBodyResult {
      return {
        body: parseRawBody(rawBody, contentType),
        rawBody,
      }
    })
    .catch(function (): RequestBodyResult {
      return { body: undefined }
    })
    .then(function (result): RequestBodyResult {
      state.result = result
      return result
    })

  requestBodyCache.set(req, state)
  return state.promise
}

function bindReadable(req: IncomingMessage, readable: PassThrough): void {
  const methodNames = [
    'addListener',
    'isPaused',
    'on',
    'once',
    'pause',
    'pipe',
    'read',
    'removeAllListeners',
    'removeListener',
    'resume',
    'setEncoding',
    'unpipe',
  ]

  for (const methodName of methodNames) {
    const method = readable[methodName as keyof PassThrough]
    if (typeof method === 'function') {
      Object.defineProperty(req, methodName, {
        configurable: true,
        value: method.bind(readable),
        writable: true,
      })
    }
  }

  Object.defineProperty(req, Symbol.asyncIterator, {
    configurable: true,
    value: readable[Symbol.asyncIterator].bind(readable),
    writable: true,
  })

  for (const propertyName of [
    'readable',
    'readableEncoding',
    'readableEnded',
    'readableFlowing',
    'readableHighWaterMark',
    'readableLength',
    'readableObjectMode',
  ]) {
    Object.defineProperty(req, propertyName, {
      configurable: true,
      get: function () {
        return readable[propertyName as keyof PassThrough]
      },
    })
  }
}

export function readBody(req: IncomingMessage): Promise<ParsedBody> {
  return readRequestBody(req).then(function (result) {
    return result.body
  })
}

export function restoreBody(req: IncomingMessage): void {
  const state = requestBodyCache.get(req)
  if (!state || state.restored || !state.result || !state.result.rawBody) {
    return
  }

  const readable = new PassThrough()
  readable.end(state.result.rawBody)
  bindReadable(req, readable)
  state.restored = true
}
