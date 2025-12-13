import type { EventBusEvent, EventBusType } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'

/**
 * 事件总线
 * 用于在数据库变更时通知相关组件
 */
export class EventBus {
  private handlers: Map<EventBusType, Set<(event: EventBusEvent) => void>> =
    new Map()

  /**
   * 触发事件
   */
  emit(type: EventBusType, data?: any): void {
    const event: EventBusEvent = {
      type,
      data,
      timestamp: Date.now(),
    }

    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          logger.error(`[EventBus] 处理事件失败 [${type}]:`, error)
        }
      })
    }

    logger.debug(`[EventBus] 事件已触发: ${type}`)
  }

  /**
   * 监听事件
   */
  on(type: EventBusType, handler: (event: EventBusEvent) => void): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  /**
   * 取消监听事件
   */
  off(type: EventBusType, handler: (event: EventBusEvent) => void): void {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.handlers.clear()
  }
}
