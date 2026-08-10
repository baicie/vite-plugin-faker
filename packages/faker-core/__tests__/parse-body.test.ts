import type { IncomingMessage } from 'node:http'
import { PassThrough } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { readBody, restoreBody } from '../src/mock/parse-body'

function createRequest(body: string, contentType: string): IncomingMessage {
  const request = new PassThrough() as unknown as IncomingMessage
  request.method = 'POST'
  request.headers = {
    'content-length': String(Buffer.byteLength(body)),
    'content-type': contentType,
  }
  request.end(body)
  return request
}

function collectBody(request: IncomingMessage): Promise<string> {
  return new Promise(function (resolve, reject) {
    const chunks: Buffer[] = []
    request.on('data', function (chunk: Buffer | string) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    request.once('error', reject)
    request.once('end', function () {
      resolve(Buffer.concat(chunks).toString())
    })
  })
}

describe('request body parsing', () => {
  it('restores the raw body after parsing', async () => {
    const rawBody = JSON.stringify({ name: 'Ada' })
    const request = createRequest(rawBody, 'application/json')

    await expect(readBody(request)).resolves.toEqual({ name: 'Ada' })
    await expect(readBody(request)).resolves.toEqual({ name: 'Ada' })

    restoreBody(request)

    await expect(collectBody(request)).resolves.toBe(rawBody)
  })
})
