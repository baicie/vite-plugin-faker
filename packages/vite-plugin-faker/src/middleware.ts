import type { OutgoingHttpHeaders } from 'node:http'
import { parse as parse_url } from 'node:url'
import type { Connect, ViteDevServer } from 'vite'
import { MockDataGenerator } from './faker-generator'
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
    const pathname = parse_url(req.url).pathname
    console.log('pathname', pathname)
    res.on('finish', () => {
      if (!requestsDB.getRequest(pathname)) {
        requestsDB.saveRequest(pathname, {
          req: req.headers,
          res: res.getHeaders(),
        })
      } else {
        const { req: _req, res: _res } = requestsDB.getRequest(pathname)
        requestsDB.updateRequest(pathname, {
          req: { ..._req, ...req.headers },
          res: { ..._res, ...res.getHeaders() },
        })
      }
      requestsDB.save()
    })
    next()
  }
}

export function mockMiddleware(
  _server: ViteDevServer,
  dbManager: DBManager,
): Connect.NextHandleFunction {
  const mocksDB = dbManager.getMocksDB()
  const generator = new MockDataGenerator()

  return (req, res, next) => {
    const url = req.url?.split('?')[0] || ''
    const method = req.method || 'GET'

    // 查找匹配的mock配置
    const mockConfig = mocksDB.findMock(url, method)

    if (mockConfig && mockConfig.enabled) {
      // 如果找到匹配的mock配置，进行模拟响应

      // 添加延迟
      const delay = mockConfig.delay || 0

      setTimeout(() => {
        // 设置响应头
        res.statusCode = mockConfig.statusCode || 200

        if (mockConfig.headers) {
          Object.entries(mockConfig.headers).forEach(([key, value]) => {
            res.setHeader(key, value)
          })
        }

        // 默认设置JSON内容类型
        if (!res.hasHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json')
        }

        // 生成响应数据
        let responseData

        switch (mockConfig.responseType) {
          case 'faker':
            responseData = generator.generateFromTemplate(
              mockConfig.responseTemplate || '{}',
            )
            break
          case 'function':
            responseData = generator.generateFromFunction(
              mockConfig.responseCode || '',
              {
                url,
                method,
                headers: req.headers,
                query: req.query,
                body: req.body,
              },
            )
            break
          case 'static':
          default:
            responseData = generator.generateStatic(mockConfig.responseData)
        }

        // 发送响应
        res.end(JSON.stringify(responseData))
      }, delay)
    } else {
      // 没有匹配的mock配置，继续正常请求
      next()
    }
  }
}
