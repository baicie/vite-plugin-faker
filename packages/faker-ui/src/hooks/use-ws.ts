import { WSClient } from '@baicie/faker-shared'
import type { Logger } from '@baicie/logger'

export let wsClient: WSClient

export function connect(wsUrl: string, logger: Logger) {
  if (!wsClient) {
    wsClient = new WSClient(wsUrl, logger)
  }
}
