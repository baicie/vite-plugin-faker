export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

// 日志配置接口
export interface LoggerOptions {
  level: LogLevel
  prefix?: string
  useTimestamp?: boolean
  useColors?: boolean
}

// 默认配置
const defaultOptions: LoggerOptions = {
  level: LogLevel.INFO,
  prefix: 'faker-ui',
  useTimestamp: true,
  useColors: true,
}

// 颜色配置
const colors = {
  debug: '#8c8c8c', // 灰色
  info: '#1890ff', // 蓝色
  warn: '#faad14', // 黄色
  error: '#f5222d', // 红色
  reset: '', // 重置颜色
}

// 创建安全URL对象的辅助函数，避免Invalid URL错误
export function safeCreateURL(url: string, base?: string | URL): URL | null {
  try {
    // 确保URL格式有效
    if (!url.includes('://') && !base) {
      // 尝试添加默认协议
      if (url.startsWith('/')) {
        url = `http://localhost${url}`
      } else {
        url = `http://${url}`
      }
    }
    return new URL(url, base)
  } catch (e) {
    logger.error(
      `创建URL对象失败: ${e instanceof Error ? e.message : String(e)}`,
      { url, base },
    )
    return null
  }
}

// URL参数解析，安全处理URL对象
export function parseUrlParams(urlString: string): Record<string, string> {
  const params: Record<string, string> = {}

  try {
    const url = safeCreateURL(urlString)
    if (!url) return params

    url.searchParams.forEach((value, key) => {
      params[key] = value
    })
  } catch (e) {
    logger.error(
      `解析URL参数失败: ${e instanceof Error ? e.message : String(e)}`,
    )
  }

  return params
}

// 日志实例类
class Logger {
  private options: LoggerOptions

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...defaultOptions, ...options }
  }
  // 设置日志级别
  setLevel(level: LogLevel): void {
    this.options.level = level
  }

  // 更新日志配置
  configure(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options }
  }

  // 格式化日志消息
  private format(level: string, message: string): string {
    const parts: string[] = []

    // 添加时间戳
    if (this.options.useTimestamp) {
      const now = new Date()
      const timeStr = now.toLocaleTimeString()
      parts.push(`[${timeStr}]`)
    }

    // 添加前缀
    if (this.options.prefix) {
      parts.push(`[${this.options.prefix}]`)
    }

    // 添加日志级别
    parts.push(`[${level.toUpperCase()}]`)

    // 添加消息
    parts.push(message)

    return parts.join(' ')
  }

  // 检查是否应记录特定级别的日志
  private shouldLog(level: LogLevel): boolean {
    return level >= this.options.level
  }

  // 调试日志
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return

    const formattedMessage = this.format('debug', message)
    if (this.options.useColors) {
      console.debug(`%c${formattedMessage}`, `color: ${colors.debug}`, ...args)
    } else {
      console.debug(formattedMessage, ...args)
    }
  }

  // 信息日志
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return

    const formattedMessage = this.format('info', message)
    if (this.options.useColors) {
      console.info(`%c${formattedMessage}`, `color: ${colors.info}`, ...args)
    } else {
      console.info(formattedMessage, ...args)
    }
  }

  // 警告日志
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return

    const formattedMessage = this.format('warn', message)
    if (this.options.useColors) {
      console.warn(`%c${formattedMessage}`, `color: ${colors.warn}`, ...args)
    } else {
      console.warn(formattedMessage, ...args)
    }
  }

  // 错误日志
  error(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const formattedMessage = this.format('error', message)
    if (this.options.useColors) {
      console.error(`%c${formattedMessage}`, `color: ${colors.error}`, ...args)
    } else {
      console.error(formattedMessage, ...args)
    }
  }

  // 创建新的Logger实例
  child(options: Partial<LoggerOptions>): Logger {
    return new Logger({ ...this.options, ...options })
  }
}

// 创建默认日志实例
export const logger = new Logger()

// 导出默认实例
export default logger
