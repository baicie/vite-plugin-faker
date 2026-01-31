import type { EventBusType, EventBusEvent } from '@baicie/faker-shared'

/**
 * 事件总线接口
 */
export interface EventBus {
  emit(type: EventBusType, data?: any): void
  on?(type: EventBusType, handler: (event: EventBusEvent) => void): void
  off?(type: EventBusType, handler: (event: EventBusEvent) => void): void
}
