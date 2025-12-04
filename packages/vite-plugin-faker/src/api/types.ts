import type { EventBusType } from '@baicie/faker-shared'

/**
 * 事件总线接口
 */
export interface EventBus {
  emit(type: EventBusType, data?: any): void
}
