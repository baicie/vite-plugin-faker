import { logger } from '@baicie/faker-shared'
import { HttpResponse, http } from 'msw'

export const handlers = [
  // 拦截所有 GET 请求
  http.get('*', async ({ request }) => {
    const url = new URL(request.url)

    // 排除静态资源
    if (/\.(?:js|css|png|jpg|svg|ico|woff|woff2|map)$/.test(url.pathname)) {
      logger.info('🚫 MSW 跳过静态资源:', request.url)
      return
    }

    logger.info('🎭 MSW 拦截 GET 请求:', request.url)

    // 这里可以根据 URL 决定是否返回模拟数据
    // 或者转发到你的 faker-ui 处理器

    return HttpResponse.json({
      message: '这是 MSW 拦截的响应',
      url: request.url,
      method: 'GET',
      timestamp: new Date().toISOString(),
    })
  }),

  // 拦截所有 POST 请求
  http.post('*', async ({ request }) => {
    logger.info('🎭 MSW 拦截 POST 请求:', request.url)

    const body = await request.json().catch(() => ({}))

    return HttpResponse.json({
      message: '这是 MSW 拦截的 POST 响应',
      url: request.url,
      method: 'POST',
      receivedData: body,
    })
  }),

  // 拦截所有 PUT 请求
  http.put('*', async ({ request }) => {
    logger.info('🎭 MSW 拦截 PUT 请求:', request.url)
    return HttpResponse.json({ message: 'PUT 请求被拦截' })
  }),

  // 拦截所有 DELETE 请求
  http.delete('*', async ({ request }) => {
    logger.info('🎭 MSW 拦截 DELETE 请求:', request.url)
    return HttpResponse.json({ message: 'DELETE 请求被拦截' })
  }),

  // 拦截所有 PATCH 请求
  http.patch('*', async ({ request }) => {
    logger.info('🎭 MSW 拦截 PATCH 请求:', request.url)
    return HttpResponse.json({ message: 'PATCH 请求被拦截' })
  }),
]
