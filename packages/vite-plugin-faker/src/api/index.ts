import type { ViteDevServer } from 'vite'
import type { DashboardQuery, IRequest } from '@baicie/faker-shared'
import { IApi, ICustomEvent } from '@baicie/faker-shared'
import type { DBManager } from '../db'

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
    switch (event.url) {
      case IApi.dashboard: {
        const params = event.data as DashboardQuery
        const response = dbManager
          .getRequestsDB()
          .getRequestsWithPagination(
            params.page,
            params.pageSize,
            params.search,
          )
        server.ws.send(ICustomEvent.response, {
          uuid: event.uuid,
          data: response,
        })
        break
      }
    }
  } catch (error) {
    server.ws.send(ICustomEvent.response, {
      uuid: event.uuid,
      error: error instanceof Error ? error.message : '未知错误',
    })
  }
}
