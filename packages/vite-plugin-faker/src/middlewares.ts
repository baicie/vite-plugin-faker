import type { Connect, ViteDevServer } from 'vite'
import fs from 'node:fs'
import { WORKER_PATH } from './constants'
import { MSWWORKER } from '@baicie/faker-shared'

export function workerMiddleware(
  _server: ViteDevServer,
): Connect.NextHandleFunction {
  return async function viteWorkerMiddleware(req, res, next) {
    if (req.url === `/${MSWWORKER}`) {
      res.setHeader('Content-Type', 'application/javascript')
      res.end(fs.readFileSync(WORKER_PATH, 'utf-8'))
    }
    next()
  }
}
