import type { OutgoingHttpHeaders } from 'node:http'
import type { Connect, ViteDevServer } from 'vite'
import type { DBManager } from './db'

export interface DBItem {
  req: Connect.IncomingMessage['headers']
  res: OutgoingHttpHeaders
}

export function holdMiddleware(
  _server: ViteDevServer,
  dbManager: DBManager,
): Connect.NextHandleFunction {
  const requestsDB = dbManager.getRequestsDB()
  return (req, res, next) => {
    const url = req.url
    res.on('finish', () => {
      if (!requestsDB.getRequest(url)) {
        requestsDB.saveRequest(url, { req: req.headers, res: res.getHeaders() })
      } else {
        const { req: _req, res: _res } = requestsDB.getRequest(url)
        requestsDB.updateRequest(url, {
          req: { ..._req, ...req.headers },
          res: { ..._res, ...res.getHeaders() },
        })
      }
      requestsDB.save()
    })
    next()
  }
}
