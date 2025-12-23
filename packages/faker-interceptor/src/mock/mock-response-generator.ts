import type { MockConfig } from '@baicie/faker-shared'
import { BrowserFakerGenerator } from './faker-generator'

/**
 * Mock 响应生成器
 * 统一处理 Mock 响应的生成逻辑
 */
export class MockResponseGenerator {
  private generator: BrowserFakerGenerator

  constructor() {
    this.generator = new BrowserFakerGenerator()
  }

  /**
   * 生成响应数据
   */
  generateResponseData(mock: MockConfig, requestInfo?: any): any {
    switch (mock.responseType) {
      case 'static':
        return this.generator.generateStatic(mock.responseData)

      case 'faker':
        return this.generator.generateFromTemplate(
          mock.responseTemplate || '{}',
          requestInfo,
        )

      case 'function':
        return this.generator.executeFunction(
          mock.responseCode || '',
          requestInfo,
        )

      default:
        return {}
    }
  }

  /**
   * 获取响应头
   */
  getResponseHeaders(mock: MockConfig): Record<string, string> {
    const headers = { ...(mock.headers || {}) }
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }
}
