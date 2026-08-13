import { WSClient } from '@baicie/faker-shared/browser'
import type { FakerHotContext, FakerLogger } from '@baicie/faker-shared'

export let wsClient: WSClient

let connectedUrl = ''

export function connect(
  wsUrl: string,
  logger: FakerLogger,
  hotContext?: FakerHotContext,
): WSClient {
  if (wsClient && connectedUrl === wsUrl && wsClient.getStatus() !== 'closed') {
    return wsClient
  }

  if (wsClient) {
    wsClient.close()
  }

  connectedUrl = wsUrl
  wsClient = new WSClient(wsUrl, logger, hotContext)
  return wsClient
}

export function disconnect(client?: WSClient): void {
  if (!wsClient || (client && client !== wsClient)) {
    return
  }

  wsClient.close()
  connectedUrl = ''
}
