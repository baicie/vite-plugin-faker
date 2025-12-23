import type { MockConfig } from '@baicie/faker-shared'

/**
 * URL 匹配器
 */
export class MockMatcher {
  /**
   * 匹配 URL
   */
  static matchUrl(url: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(url)
    }

    // 支持通配符和路径参数
    const regexPattern = pattern
      .replace(/\*/g, '.*') // * 匹配任意字符
      .replace(/:[^/]+/g, '[^/]+') // :id 匹配路径参数

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(url)
  }

  /**
   * 查找匹配的 Mock 配置
   */
  static findMock(
    mocks: MockConfig[],
    url: string,
    method: string,
  ): MockConfig | null {
    // 提取路径名（去除查询参数）
    const pathname = new URL(url, window.location.origin).pathname

    // 按优先级查找：精确匹配 > 通配符匹配
    const exactMatch = mocks.find(
      mock =>
        mock.enabled &&
        mock.method.toUpperCase() === method.toUpperCase() &&
        this.matchUrl(pathname, mock.url) &&
        !mock.url.includes('*') &&
        !mock.url.includes(':'),
    )

    if (exactMatch) {
      return exactMatch
    }

    // 查找通配符或路径参数匹配
    return (
      mocks.find(
        mock =>
          mock.enabled &&
          mock.method.toUpperCase() === method.toUpperCase() &&
          this.matchUrl(pathname, mock.url),
      ) || null
    )
  }
}
