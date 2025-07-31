import { ICustomEvent, type IResponse } from '@baicie/faker-shared'
import { generateUUID } from '../utils'

export * from './dashboard'

export function request<Req, Res>(url: string, req: Req): Promise<Res> {
  const uuid = generateUUID()
  import.meta.hot?.send?.(ICustomEvent.request, {
    uuid,
    url,
    data: req,
  })

  return new Promise(resolve => {
    import.meta.hot?.on(ICustomEvent.response, (event: IResponse<Res>) => {
      if (event.uuid === uuid) {
        resolve(event.data)
      }
    })
  })
}
