import { WSClient } from '@baicie/faker-shared'
import type { Logger } from '@baicie/logger'

export let wsClient: WSClient
let globalTimeout = 10000

export function connect(wsUrl: string, logger: Logger, timeout?: number) {
  if (timeout) globalTimeout = timeout
  if (!wsClient) {
    wsClient = new WSClient(wsUrl, logger)
  }
}

export function getTimeout() {
  return globalTimeout
}
