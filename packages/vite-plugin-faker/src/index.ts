import type { Plugin } from 'vite'
import { injectUI } from './ui'
import { type MockConfig, MockStorage } from './storage'
import type { StorageOptions } from './storage'
import { ServerAdapter } from './server-adapter'

export interface ViteFakerOptions extends StorageOptions {
  /**
   * 是否启用插件
   * @default true
   */
  enable?: boolean
  /**
   * 挂载UI面板的目标元素选择器
   * @default '#app'
   */
  mountTarget?: string
  /**
   * 初始化模拟配置
   */
  initialMocks?: MockConfig[]
}

export function viteFaker(options: ViteFakerOptions = {}): Plugin {
  const {
    enable = true,
    mountTarget = '#app',
    initialMocks = [],
    storageDir = '.mock',
  } = options

  // 创建服务器适配器
  const serverAdapter = new ServerAdapter({ storageDir })

  // 创建存储实例
  const mockStorage = new MockStorage({
    storageDir,
    serverAdapter,
  })

  if (!enable) {
    return {
      name: 'vite-plugin-faker:disabled',
    }
  }

  // 初始化存储的模拟配置
  if (initialMocks.length > 0) {
    mockStorage.initMocks(initialMocks)
  }

  return {
    name: 'vite-plugin-faker',
    apply: 'serve',
    configureServer(server) {
      // 注入客户端代码
      return () => {
        server.middlewares.use((req, res, next) => {
          // 这里只注入HTML页面
          if (req.url) {
            const isHtmlPage =
              !req.url.includes('.') || req.url.endsWith('.html')
            if (isHtmlPage) {
              const originalWrite = res.write
              const originalEnd = res.end

              let body = ''

              // 重写响应方法，以便我们可以修改HTML内容
              res.write = function (chunk: any, ...args: any[]) {
                body += chunk.toString()
                return true
              }

              res.end = function (chunk: any, ...args: any[]) {
                if (chunk) {
                  body += chunk.toString()
                }

                // 在</body>前注入我们的UI代码
                if (body.includes('</body>')) {
                  const script = `
                  <script type="module">
                    // 注入存储配置
                    window.__FAKER_STORAGE_CONFIG__ = ${JSON.stringify({ storageDir })};
                    // 注入UI代码
                    ${injectUI.toString()}(${JSON.stringify(mountTarget)});
                  </script>`
                  body = body.replace('</body>', `${script}</body>`)
                }

                // 恢复原始方法并写入修改后的内容
                res.write = originalWrite
                res.end = originalEnd
                return originalEnd.call(this, body)
              }
            }
          }

          next()
        })
      }
    },
    transformIndexHtml(html) {
      // 为首页添加MSW脚本
      return html.replace(
        '</head>',
        `<script>
          // MSW初始化代码
          window.__MSW_ENABLED__ = true;
          window.__FAKER_CONFIG__ = ${JSON.stringify(mockStorage.getMocks())};
        </script></head>`,
      )
    },
  }
}

export * from './types'
export * from './storage'
export * from './server-adapter'

export default viteFaker
