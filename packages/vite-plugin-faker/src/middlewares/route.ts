import { UI_PATH_REG } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import path from 'node:path'
import type { Connect, ViteDevServer } from 'vite'
import type { ViteFakerConfig } from '../config'
import { CLIENT_UI_CSS, CLIENT_UI_PATH } from '../constants'

const createPage = (src: string, css: string): string => `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Faker UI</title>
      <script type="module" src=${css}></script>
      <script type="module" src=${src}></script>
    </head>
    <body>
      <div id="mock-ui"></div>
    </body>
  </html>
`

export function routeMiddleware(
  server: ViteDevServer,
  _config: ViteFakerConfig,
): Connect.NextHandleFunction {
  return async function viteRouteMiddleware(req, res, next) {
    try {
      if (req.url && UI_PATH_REG.test(req.url)) {
        const page = createPage(
          path.posix.join(server.config.base, CLIENT_UI_PATH),
          path.posix.join(server.config.base, CLIENT_UI_CSS),
        )
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.write(page)
        res.end()
        return
      } else {
        return next()
      }
    } catch (err) {
      logger.error('route error', err)
      return next(err)
    }
  }
}
