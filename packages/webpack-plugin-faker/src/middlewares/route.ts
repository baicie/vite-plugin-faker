import { UI_PATH_REG } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FakerConfig } from '../types'
import { 
  CLIENT_UI_CSS, 
  CLIENT_UI_PATH, 
  CLIENT_INTERCEPTOR_PATH,
  UI_ENTRY,
  UI_CSS,
  INTERCEPTOR_PATH
} from '../constants'

const createPage = (publicPath: string): string => {
  // Ensure publicPath ends with / if not empty, or handle joining correctly
  const base = publicPath.endsWith('/') ? publicPath : publicPath + '/'
  const uiSrc = path.posix.join(base, CLIENT_UI_PATH.replace(/^\//, ''))
  const cssSrc = path.posix.join(base, CLIENT_UI_CSS.replace(/^\//, ''))
  
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Faker UI</title>
      <script type="module" src="${cssSrc}"></script>
      <script type="module" src="${uiSrc}"></script>
    </head>
    <body>
      <div id="mock-ui"></div>
    </body>
  </html>
`
}

export function routeMiddleware(
  config: FakerConfig,
  publicPath: string = '/'
): (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void) => void {
  return async function (req: any, res: any, next: any) {
    try {
      if (!req.url) return next()

      // 1. Serve HTML for UI path
      if (UI_PATH_REG.test(req.url)) {
        const page = createPage(publicPath)
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.write(page)
        res.end()
        return
      }
      
      // 2. Serve Assets
      const handleAsset = (filePath: string, contentType: string, replaceContent?: boolean) => {
        if (!filePath) {
          logger.error('Asset path is empty. Please check if dependencies are installed correctly.')
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.write('Asset not found (empty path)')
          res.end()
          return
        }

        try {
          if (!fs.existsSync(filePath)) {
             logger.error(`Asset not found at path: ${filePath}`)
             res.writeHead(404, { 'Content-Type': 'text/plain' })
             res.write('Asset not found')
             res.end()
             return
          }

          let content = fs.readFileSync(filePath, 'utf-8')
          
          if (replaceContent) {
            content = content
              .replace(`__MOUNT_TARGET__`, JSON.stringify(config.mountTarget))
              .replace(`__FAKER_WS_PORT__`, JSON.stringify(config.uiOptions?.wsPort))
              .replace(`__FAKER_LOGGER_OPTIONS__`, JSON.stringify(config.loggerOptions))
              .replace(`__FAKER_UI_OPTIONS__`, JSON.stringify(config.uiOptions))
          }
          
          res.writeHead(200, { 'Content-Type': contentType })
          res.write(content)
          res.end()
        } catch (e) {
          logger.error(`Failed to serve asset ${filePath}`, e)
          next(e)
        }
      }

      const normalizeUrl = (url: string) => url.split('?')[0]
      const url = normalizeUrl(req.url)

      // Construct expected paths
      // Note: CLIENT_UI_PATH starts with /
      const expectedUiPath = path.posix.join(publicPath, CLIENT_UI_PATH).replace(/\/+/g, '/')
      const expectedCssPath = path.posix.join(publicPath, CLIENT_UI_CSS).replace(/\/+/g, '/')
      const expectedInterceptorPath = path.posix.join(publicPath, CLIENT_INTERCEPTOR_PATH).replace(/\/+/g, '/')

      if (url === expectedUiPath) {
        handleAsset(UI_ENTRY, 'application/javascript', true)
        return
      }

      if (url === expectedCssPath) {
        handleAsset(UI_CSS, 'text/css')
        return
      }

      if (url === expectedInterceptorPath) {
        handleAsset(INTERCEPTOR_PATH, 'application/javascript', true)
        return
      }

      return next()
    } catch (err) {
      logger.error('route error', err)
      return next(err)
    }
  }
}
