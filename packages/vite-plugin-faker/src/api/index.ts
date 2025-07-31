import type { ViteDevServer } from 'vite'
import { ICustomEvent } from '@baicie/faker-shared'
import type { IRequest } from '@baicie/faker-shared'
import type { DBManager } from '../db'
import { handleRequest } from './router'

export function registerApis(
  server: ViteDevServer,
  dbManager: DBManager,
): void {
  server.ws.on(ICustomEvent.request, (event: IRequest<unknown>) => {
    handleWebSocketMessage(server, event, dbManager)
  })
}

function handleWebSocketMessage(
  server: ViteDevServer,
  event: IRequest<unknown>,
  dbManager: DBManager,
) {
  try {
    const response = handleRequest(event.url, event.data, dbManager)

    // 发送成功响应
    server.ws.send(ICustomEvent.response, {
      uuid: event.uuid,
      data: response,
    })
  } catch (error) {
    server.ws.send(ICustomEvent.response, {
      uuid: event.uuid,
      error: error instanceof Error ? error.message : '未知错误',
    })
  }
}
