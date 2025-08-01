import { MockDataGenerator } from '../../faker-generator'
import type { DBManager } from '../../db'

// 获取所有 mock 配置
export function getMockConfig(_data: unknown, dbManager: DBManager): any {
  return dbManager.getMocksDB().getAllMocks()
}

// 处理 mock 请求并生成响应
export function handleMockRequest(
  requestData: unknown,
  dbManager: DBManager,
): any {
  const { url, method, headers, body } = requestData as {
    url: string
    method: string
    headers: Record<string, string>
    body?: any
  }

  // 查找匹配的 mock 配置
  const mocks = dbManager.getMocksDB().getAllMocks()
  const matchingMock = mocks.find(mock => {
    if (!mock.enabled || mock.method !== method.toUpperCase()) {
      return false
    }

    const pattern = mock.url.replace(/\*/g, '.*')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(url)
  })

  if (!matchingMock) {
    throw new Error('No matching mock found')
  }

  // 生成 mock 响应
  const generator = new MockDataGenerator()
  let mockData: any

  switch (matchingMock.responseType) {
    case 'faker':
      mockData = generator.generateFromTemplate(
        matchingMock.responseTemplate || '{}',
      )
      break
    case 'function':
      mockData = generator.generateFromFunction(
        matchingMock.responseCode || '',
        {
          url,
          method,
          headers,
          body,
        },
      )
      break
    case 'static':
    default:
      mockData = generator.generateStatic(matchingMock.responseData)
      break
  }

  return {
    data: mockData,
    status: matchingMock.statusCode || 200,
    statusText: 'OK',
    headers: matchingMock.headers || {},
    delay: matchingMock.delay || 0,
  }
}
